import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitService } from 'src/github/git.service';
import { GithubService } from 'src/github/github.service';
import { GroqService } from 'src/groq/groq.service';
import { tool } from 'langchain';
import { createDeepAgent } from 'deepagents';
import { ChatGroq } from '@langchain/groq';

import { success, z } from 'zod';
import { AgentModule } from './agent.module';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private githubService: GithubService,
    private gitService: GitService,
    private groqService: GroqService,
    private configService: ConfigService,
  ) {}

  //build tools
  private buildTools(repoPath?: string) {
    const planFromSpec = tool(
      async ({ spec }) => {
        const plan = await this.groqService.planFromSpec(spec);
        return JSON.stringify(plan);
      },
      {
        name: 'plan_from_spec',
        description:
          'Read a spec and extract branch name, PR title, commit message and file list',
        schema: z.object({
          spec: z.string().describe('The full feature spec'),
        }),
      },
    );

    const generateFile = tool(
      async ({ spec, filePath, plan, previousFiles }) => {
        const content = await this.groqService.generateFile(
          spec,
          filePath,
          JSON.parse(plan),
          JSON.parse(previousFiles),
        );
        return content;
      },
      {
        name: 'generate_file',
        description: 'Generate code for a single file based on the spec',
        schema: z.object({
          spec: z.string(),
          filePath: z.string().describe('File path to generate'),
          plan: z.string().describe('JSON stringified plan'),
          previousFiles: z
            .string()
            .describe('JSON stringified array of already generated files'),
        }),
      },
    );

    const checkoutMain = tool(
      async () => {
        this.gitService.checkoutMain(repoPath);
        return 'Checked out main';
      },
      {
        name: 'checkout_main',
        description: 'Checkout main branch and pull latest',
        schema: z.object({}),
      },
    );

    const createBranch = tool(
      async ({ branch }) => {
        this.gitService.createBranch(branch, repoPath);
        return `Created branch ${branch}`;
      },
      {
        name: 'create_branch',
        description: 'Create a new git branch',
        schema: z.object({
          branch: z.string(),
        }),
      },
    );

    const writeFile = tool(
      async ({ filePath, content }) => {
        this.gitService.writeFile(filePath, content, repoPath);
        return `Written ${filePath}`;
      },
      {
        name: 'write_file',
        description: 'Write content to a file on local disk',
        schema: z.object({
          filePath: z.string(),
          content: z.string(),
        }),
      },
    );

    const readFile = tool(
      async ({ filePath }) => {
        return this.gitService.readFile(filePath, repoPath);
      },
      {
        name: 'read_file',
        description: 'Read a file from local disk',
        schema: z.object({
          filePath: z.string(),
        }),
      },
    );

    const installDeps = tool(
      async () => {
        this.gitService.installDependencies();
        return 'Dependencies installed';
      },
      {
        name: 'install_dependencies',
        description: 'Run npm install in the repo',
        schema: z.object({}),
      },
    );

    const runTests = tool(
      async () => {
        const passed = this.gitService.runTests(repoPath);
        return passed ? 'TESTS_PASSED' : 'TESTS_FAILED';
      },
      {
        name: 'run_tests',
        description: 'Run tests and return TESTS_PASSED or TESTS_FAILED',
        schema: z.object({}),
      },
    );

    const commitAndPush = tool(
      async ({ branch, message }) => {
        const pushed = this.gitService.commitAndPush(branch, message, repoPath);
        return pushed ? 'PUSHED' : 'NOTHING_TO_PUSH';
      },
      {
        name: 'commit_and_push',
        description: 'Commit all changes and push to GitHub',
        schema: z.object({
          branch: z.string(),
          message: z.string(),
        }),
      },
    );

    const openPR = tool(
      async ({ branch, title, body }) => {
        const pr = await this.githubService.openPR(branch, title, body);
        return JSON.stringify({ number: pr.number, url: pr.html_url });
      },
      {
        name: 'open_pr',
        description: 'Open a pull request on GitHub',
        schema: z.object({
          branch: z.string(),
          title: z.string(),
          body: z.string(),
        }),
      },
    );

    const getComments = tool(
      async ({ prNumber }) => {
        const { inline, general } =
          await this.githubService.getAllComments(prNumber);
        return JSON.stringify({
          inline,
          general,
          total: inline.length + general.length,
        });
      },
      {
        name: 'get_comments',
        description: 'Get all unresolved CodeRabbit comments on a PR',
        schema: z.object({
          prNumber: z.number(),
        }),
      },
    );

    const fixFile = tool(
      async ({ filePath, issues }) => {
        const content = this.gitService.readFile(filePath, repoPath);
        const fixed = await this.groqService.fixFile(filePath, content, issues);
        if (!fixed) return 'FAILED';
        this.gitService.writeFile(filePath, fixed, repoPath);
        return `FIXED: ${filePath}`;
      },
      {
        name: 'fix_file',
        description: 'Fix a file based on CodeRabbit issues using Groq',
        schema: z.object({
          filePath: z.string(),
          issues: z.string().describe('Issues to fix from CodeRabbit'),
        }),
      },
    );

    const resolveComments = tool(
      async ({ prNumber, comments, fixedFiles }) => {
        await this.githubService.resolveComments(
          prNumber,
          JSON.parse(comments),
          JSON.parse(fixedFiles),
        );
        return 'Comments resolved';
      },
      {
        name: 'resolve_comments',
        description: 'Reply to and resolve CodeRabbit comments for fixed files',
        schema: z.object({
          prNumber: z.number(),
          comments: z.string(),
          fixedFiles: z.string(),
        }),
      },
    );

    const triggerReview = tool(
      async ({ prNumber }) => {
        await this.githubService.triggerReview(prNumber);
        return 'Review triggered';
      },
      {
        name: 'trigger_review',
        description: 'Trigger CodeRabbit to re-review the PR',
        schema: z.object({
          prNumber: z.number(),
        }),
      },
    );

    const waitForReview = tool(
      async ({ prNumber }) => {
        const state = await this.githubService.waitForReview(prNumber);
        return state;
      },
      {
        name: 'wait_for_review',
        description:
          'Wait for CodeRabbit to finish reviewing. Returns: approved, changes_requested, commented, timed_out',
        schema: z.object({
          prNumber: z.number(),
        }),
      },
    );

    const mergePR = tool(
      async ({ prNumber }) => {
        await this.githubService.mergePR(prNumber);
        return `PR #${prNumber} merged successfully`;
      },
      {
        name: 'merge_pr',
        description: 'Merge the PR on GitHub',
        schema: z.object({
          prNumber: z.number(),
        }),
      },
    );

    return [
      planFromSpec,
      generateFile,
      checkoutMain,
      createBranch,
      writeFile,
      readFile,
      installDeps,
      runTests,
      commitAndPush,
      openPR,
      getComments,
      fixFile,
      resolveComments,
      triggerReview,
      waitForReview,
      mergePR,
    ];
  }

  // SHIP FEATURE
  async shipFeature(spec: string, repoPath?: string) {
    this.logger.log('🚀 Starting shipFeature with Lanchain');

    const tools = this.buildTools(repoPath);

    const agent = createDeepAgent({
      model: new ChatGroq({
        apiKey: this.configService.getOrThrow<string>('GROQ_API_KEY'),
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
      }),
      tools,
      systemPrompt: `
        
            You are an expert software engineering agent.
            Your goal is to implement a spec end to end and ship it.

            Follow these steps IN ORDER:
            1. plan_from_spec — extract branch, title, files
            2. checkout_main — get latest main
            3. create_branch — create feature branch
            4. generate_file — generate each file one by one
            5. write_file — write each generated file to disk
            5. write_file — write each generated file to disk
            6. install_dependencies — run npm install
            7. run_tests — run the tests
            8. If TESTS_FAILED — fix files and run_tests again (max 3 times)
            9. commit_and_push — commit and push the branch
            10. open_pr — open a pull request
            11. trigger_review — trigger CodeRabbit review
            12. wait_for_review — wait for CodeRabbit
            13. If comments exist — get_comments → fix_file → run_tests → commit_and_push → resolve_comments → trigger_review → wait_for_review
            14. If approved — merge_pr
            15. Report success

            RULES:
            - Always run tests before pushing
            - Fix tests if they fail before pushing
            - Never push broken code
            - Loop on CodeRabbit comments until approved or 5 attempts
            - Stop after 5 fix attempts
        `,
    });

    const result = await agent.invoke({
      messages: [
        {
          role: 'human',
          content: `Ship this spec: \n\n${spec}`,
        },
      ],
    });

    const output = result.messages[result.messages.length - 1].content;
    this.logger.log(`✅ Agent finished: ${output}`);
    return { success: true, message: output };
  }

  async fixAndMerge(prNumber: number, branch: string, repoPath?: string) {
    this.logger.log(`🔄 Starting fixAndMerge for PR #${prNumber}`);

    const tools = this.buildTools(repoPath);

    const agent = createDeepAgent({
      model: new ChatGroq({
        apiKey: this.configService.get<string>('GROQ_API_KEY'),
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
      }),
      tools,
      systemPrompt: `
You are an expert code fixing agent.
Your goal is to fix all CodeRabbit comments on a PR and merge it.

        Follow these steps:
        1. get_comments — get all CodeRabbit comments
        2. If no comments — merge_pr and stop
        3. For each file with comments:
        - fix_file — fix using the issue description
        4. run_tests — make sure tests still pass
        5. If TESTS_FAILED — fix_file again and run_tests
        6. commit_and_push — push the fixes
        7. resolve_comments — reply and resolve threads
        8. trigger_review — trigger CodeRabbit re-review
        9. wait_for_review — wait for result
        10. If approved — merge_pr and stop
        11. If changes_requested — go back to step 1
        12. Stop after 5 attempts

        RULES:
        - Always run tests before pushing
        - Resolve comments after fixing
        - Never merge if tests fail
        - Stop after 5 attempts
      `,
    });

    const result = await agent.invoke({
      messages: [
        {
          role: 'user',
          content: `Fix and merge PR #${prNumber} on branch ${branch}`,
        },
      ],
    });

    const output = result.messages[result.messages.length - 1].content;
    this.logger.log(`✅ Agent finished: ${output}`);
    return { success: true, message: output };
  }
}

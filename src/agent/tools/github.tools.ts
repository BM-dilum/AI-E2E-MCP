import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { GitService } from 'src/github/git.service';
import { GithubService } from 'src/github/github.service';
import { GroqService } from 'src/groq/groq.service';

@Injectable()
export class GithubTools {
  constructor(
    private githubService: GithubService,
    private gitService: GitService,
    private groqService: GroqService,
  ) {}

  openPR() {
    return tool(
      async ({ branch, title, body }) => {
        try {
          this.gitService.getCurrentBranch();
        } catch (error) {
          return `PR_BLOCKED: branch ${branch} does not exist on GitHub — push it first`;
        }
        const pr = await this.githubService.openPR(branch, title, body);
        return `PR_OPENED: ${JSON.stringify({ number: pr.number, url: pr.html_url })}`;
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
  }

  getComments() {
    return tool(
      async ({ prNumber }) => {
        const { inline, general } =
          await this.githubService.getAllComments(prNumber);
        return JSON.stringify({
          total: inline.length + general.length,
          files: [...new Set(inline.map((c) => c.path))],
          inline: inline.map((c) => ({ path: c.path, body: c.body })),
          general: general.map((c) => ({ body: c.body })),
        });
      },
      {
        name: 'get_comments',
        description: 'Get unresolved CodeRabbit comments on a PR',
        schema: z.object({ prNumber: z.number() }),
      },
    );
  }

  fixFile(repoPath?: string) {
    return tool(
      async ({ filePath, issues }) => {
        const content = this.gitService.readFile(filePath, repoPath);
        const fixed = await this.groqService.fixFile(filePath, content, issues);
        if (!fixed) return 'FAILED';
        this.gitService.writeFile(filePath, fixed, repoPath);
        return `FIXED: ${filePath}`;
      },
      {
        name: 'fix_file',
        description: 'Fix a file based on CodeRabbit issues',
        schema: z.object({
          filePath: z.string(),
          issues: z.string(),
        }),
      },
    );
  }

  runTests(repoPath?: string) {
    return tool(
      async () => {
        const passed = this.gitService.runTests(repoPath);
        return passed ? 'TESTS_PASSED' : 'TESTS_FAILED';
      },
      {
        name: 'run_tests',
        description: 'Run tests after fixing',
        schema: z.object({}),
      },
    );
  }

  commitAndPush(repoPath?: string) {
    return tool(
      async ({ branch, message }) => {
        const passed = this.gitService.runTests();
        if (!passed) return 'PUSH_BLOCKED: tests are still failing';

        const pushed = this.gitService.commitAndPush(branch, message, repoPath);
        return pushed ? 'PUSHED' : 'NOTHING_TO_PUSH';
      },
      {
        name: 'commit_and_push',
        description: 'Commit and push to GitHub. Blocked if tests are failing',
        schema: z.object({
          branch: z.string(),
          message: z.string(),
        }),
      },
    );
  }

  resolveComments() {
    return tool(
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
        description: 'Resolve CodeRabbit comment threads',
        schema: z.object({
          prNumber: z.number(),
          comments: z.string(),
          fixedFiles: z.string(),
        }),
      },
    );
  }

  triggerReview() {
    return tool(
      async ({ prNumber }) => {
        await this.githubService.triggerReview(prNumber);
        return 'Review triggered';
      },
      {
        name: 'trigger_review',
        description: 'Trigger a new CodeRabbit review',
        schema: z.object({ prNumber: z.number() }),
      },
    );
  }

  waitForReview() {
    return tool(
      async ({ prNumber }) => {
        return await this.githubService.waitForReview(prNumber);
      },
      {
        name: 'wait_for_review',
        description:
          'Wait for review. Returns: approved, changes_requested, commented, timed_out',
        schema: z.object({ prNumber: z.number() }),
      },
    );
  }

  mergePR() {
    return tool(
      async ({ prNumber }) => {
        await this.githubService.mergePR(prNumber);
        return `PR #${prNumber} merged`;
      },
      {
        name: 'merge_pr',
        description: 'Squash merge the PR',
        schema: z.object({ prNumber: z.number() }),
      },
    );
  }
}

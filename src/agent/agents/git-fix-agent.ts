import { Injectable, Logger } from '@nestjs/common';
import { createAgent } from 'langchain';
import { ChatGroq } from '@langchain/groq';
import { ConfigService } from '@nestjs/config';
import { GitTools } from '../tools/git.tools';

@Injectable()
export class GitFixAgent {
  private readonly logger = new Logger(GitFixAgent.name);

  constructor(
    private gitTools: GitTools,
    private configService: ConfigService,
  ) {}

  private getModel() {
    return new ChatGroq({
      apiKey: this.configService.getOrThrow('GROQ_API_KEY'),
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
    });
  }

  async run(
    branch: string,
    commitMessage: string,
    filePaths: string[],
    repoPath?: string,
  ) {
    this.logger.log(`🧪 GitFixAgent: branch=${branch}`);

    const agent = createAgent({
      model: this.getModel(),
      tools: [
        this.gitTools.installDeps(),
        this.gitTools.runTests(repoPath),
        this.gitTools.fixFile(repoPath),
        this.gitTools.commitAndPush(repoPath),
      ],
      systemPrompt: `
        You are a git fix agent. Your job is to validate generated files by running tests,
        fixing any failures, and committing the result.

        Steps:
        1. Installs Dependencies
        2. run_tests
        3. If TESTS_PASSED → commit_and_push, then stop
        4. If TESTS_FAILED → fix_file for each of these files: ${filePaths.join(', ')}
        5. run_tests again
        6. If TESTS_PASSED → commit_and_push, then stop
        7. Repeat fix → test loop max 3 times
        8. If still failing after 3 attempts → stop, do NOT commit or push

        RULES:
        - Never commit or push if tests are failing
        - Only fix the files listed above — do not touch other files
        - Use branch: ${branch}
        - Use commit message: ${commitMessage}
      `,
      middleware: [],
    });

    const result = await agent.invoke({
      messages: [
        {
          role: 'user',
          content: `
            Run tests and fix if needed.
            Branch: ${branch}
            Commit message: ${commitMessage}
            Files to fix if tests fail: ${filePaths.join(', ')}
          `,
        },
      ],
    });

    const output = result.messages[result.messages.length - 1].content;
    this.logger.log(`✅ GitFixAgent done: ${output}`);
    return typeof output === 'string' ? output : JSON.stringify(output);
  }
}

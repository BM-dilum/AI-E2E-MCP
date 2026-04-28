import { ChatOpenAI } from '@langchain/openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAgent } from 'langchain';
import { GitTools } from '../tools/git.tools';

@Injectable()
export class GitFixAgent {
  private readonly logger = new Logger(GitFixAgent.name);

  constructor(
    private gitTools: GitTools,
    private configService: ConfigService,
  ) {}

  private getModel() {
    return new ChatOpenAI({
      apiKey: this.configService.getOrThrow('OPENAI_API_KEY'),
      model: 'gpt-5.4-mini',
      temperature: 0.1,
    });
  }

  async run(
    branch: string,
    commitMessage: string,
    filePaths: string[],
    repoPath?: string,
  ) {
    this.logger.log(`GitFixAgent: branch=${branch}`);

    const agent = createAgent({
      model: this.getModel(),
      tools: [
        this.gitTools.installDeps(repoPath),
        this.gitTools.runTests(repoPath),
        this.gitTools.fixFile(repoPath),
      ],
      systemPrompt: `
        You are a git fix agent. Your job is to validate generated files by running tests
        and fixing failures.

        Steps:
        1. install_dependencies
        2. run_tests
        3. If TESTS_PASSED, stop.
        4. If TESTS_FAILED, call fix_file for the relevant files from this list: ${filePaths.join(', ')}
        5. run_tests again.
        6. Keep fixing and testing until TESTS_PASSED.

        RULES:
        - Do not commit or push. Another service will do that only after tests pass.
        - Only fix the files listed above. Do not touch other files.
        - Use branch: ${branch}
        - Commit message for later: ${commitMessage}
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
    this.logger.log(`GitFixAgent done: ${output}`);
    return typeof output === 'string' ? output : JSON.stringify(output);
  }
}

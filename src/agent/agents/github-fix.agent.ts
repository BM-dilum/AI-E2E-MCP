import { Injectable, Logger } from '@nestjs/common';
import { createAgent } from 'langchain';

import { ConfigService } from '@nestjs/config';
import { GithubTools } from '../tools/github.tools';
import { ChatGroq } from '@langchain/groq';
import { GitTools } from '../tools/git.tools';

@Injectable()
export class GithubFixAgent {
  private readonly logger = new Logger(GithubFixAgent.name);

  constructor(
    private githubTools: GithubTools,
    private configService: ConfigService,
  ) {}

  private getModal() {
    return new ChatGroq({
      apiKey: this.configService.getOrThrow('GROQ_API_KEY'),
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
    });
  }

  async run(branch: string, prNumber: number, repoPath?: string) {
    this.logger.log(`🔁 GithubFixAgent: branch=${branch}`);

    const agent = createAgent({
      model: this.getModal(),
      tools: [
        this.githubTools.getComments(), // 6 tools — fix loop
        this.githubTools.fixFile(repoPath),
        this.githubTools.runTests(repoPath),
        this.githubTools.commitAndPush(repoPath),
        this.githubTools.resolveComments(),
        this.githubTools.triggerReview(),
        this.githubTools.waitForReview(),
        // this.githubTools.mergePR(),
      ],
      systemPrompt: `
      The PR number is ${prNumber}. The branch is ${branch}.
      Always use prNumber=${prNumber} for every tool call. Never use any other PR number.


        1. get_comments with prNumber=${prNumber}
        2.If NO_COMMENTS → merge_pr with prNumber=${prNumber} → stop
        3.fix_file for each file listed in comments using exact file paths
        4. run_tests — never push if failing
        5. commit_and_push branch=${branch} message=fix: address CodeRabbit comments
        6. resolve_comments with prNumber=${prNumber}
        7. trigger_review with prNumber=${prNumber}
        8.wait_for_review with prNumber=${prNumber}
        8. If approved → merge_pr with prNumber=${prNumber} → stop
        9. Repeat max 5 times
      `,
      middleware: [],
    });

    const result = await agent.invoke({
      messages: [
        {
          role: 'user',
          content: `Fix and merge PR #${prNumber} on branch ${branch}. Use prNumber=${prNumber} for ALL tool calls.`,
        },
      ],
    });

    const output = result.messages[result.messages.length - 1].content;
    this.logger.log(`✅ GithubFixAgent done`);
    return typeof output === 'string' ? output : JSON.stringify(output);
  }
}

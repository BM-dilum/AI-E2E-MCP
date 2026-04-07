import { Injectable, Logger } from '@nestjs/common';
import { createAgent } from 'langchain';
import { ChatGroq } from '@langchain/groq';
import { ConfigService } from '@nestjs/config';
import { GithubTools } from '../tools/github.tools';

@Injectable()
export class GithubReviewAgent {
  private readonly logger = new Logger(GithubReviewAgent.name);

  constructor(
    private githubTools: GithubTools,
    private configService: ConfigService,
  ) {}

  private getModel() {
    return new ChatGroq({
      apiKey: this.configService.getOrThrow('GROQ_API_KEY'),
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
    });
  }

  async run(branch: string, prTitle: string) {
    this.logger.log(`🐙 GithubReviewAgent: branch=${branch}`);

    const agent = createAgent({
      model: this.getModel(),
      tools: [
        this.githubTools.openPR(),
        this.githubTools.triggerAndWaitForReview(),
        // this.githubTools.mergePR(),
      ],
      systemPrompt: `
        You are a GitHub review agent.
        You have exactly 2 tools: open_pr and trigger_and_wait_for_review.
        Do not call any other tools.

        Steps:
        1. open_pr — use the branch and title provided, note the PR number from response
        2. trigger_and_wait_for_review — use the PR number from step 1

        After trigger_and_wait_for_review returns:
        - If result is APPROVED → return: APPROVED prNumber=<number>
        - If anything else → return: NOT_APPROVED prNumber=<number> result=<result>

        RULES:
        - Always include prNumber=<number> in your final response
        - Call each tool exactly once
        - Do not merge — merging happens elsewhere
        - Do not loop or retry
      `,
      middleware: [],
    });

    const result = await agent.invoke({
      messages: [
        {
          role: 'user',
          content: `Open PR and review. Branch: ${branch}. Title: ${prTitle}`,
        },
      ],
    });

    const output = result.messages[result.messages.length - 1].content;
    this.logger.log(`✅ GithubReviewAgent done: ${output}`);
    return typeof output === 'string' ? output : JSON.stringify(output);
  }
}

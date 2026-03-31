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
        this.githubTools.triggerReview(),
        this.githubTools.waitForReview(),
        this.githubTools.mergePR(),
      ],
      systemPrompt: `
        You are a GitHub review agent. Execute these steps in order:
        1. open_pr — use the branch and title provided
        2. trigger_review
        3. wait_for_review
        4. If approved → merge_pr → stop
        5. If anything else → return the review result string exactly as received, do not take further action

        RULES:
        - Only merge if explicitly approved
        - Do not loop or retry
        - Return the raw review result if not approved
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

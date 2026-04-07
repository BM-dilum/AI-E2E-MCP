import { Injectable, Logger } from '@nestjs/common';
import { createAgent } from 'langchain';
import { ChatGroq } from '@langchain/groq';
import { ConfigService } from '@nestjs/config';
import { GithubTools } from '../tools/github.tools';
import { GithubService } from 'src/github/github.service';

@Injectable()
export class GithubReviewAgent {
  private readonly logger = new Logger(GithubReviewAgent.name);

  constructor(
    private githubTools: GithubTools,
    private githubService: GithubService,
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

    // Step 1: Agent opens PR only
    const openPRAgent = createAgent({
      model: this.getModel(),
      tools: [this.githubTools.openPR()],
      systemPrompt: `
      You have exactly 1 tool: open_pr.
      Call open_pr ONCE with the branch and title provided.
      Return the exact response including PR number.
      Do not call any other tools.
    `,
      middleware: [],
    });

    const openResult = await openPRAgent.invoke(
      {
        messages: [
          {
            role: 'user',
            content: `Open PR. Branch: ${branch}. Title: ${prTitle}`,
          },
        ],
      },
      { recursionLimit: 10 },
    );

    const openOutput =
      openResult.messages[openResult.messages.length - 1].content;
    const openText =
      typeof openOutput === 'string' ? openOutput : JSON.stringify(openOutput);

    const match = openText.match(/(\d+)/);
    const prNumber = match ? parseInt(match[1]) : null;

    if (!prNumber) {
      this.logger.error('❌ Could not extract PR number');
      return 'NOT_APPROVED prNumber=null';
    }

    this.logger.log(`✅ PR opened: #${prNumber}`);

    // Step 2: Trigger + wait directly — deterministic, no agent loop
    await this.githubService.triggerReview(prNumber);
    const reviewResult = await this.githubService.waitForReview(prNumber);

    this.logger.log(`📋 Review result: ${reviewResult} for PR #${prNumber}`);

    // Step 3:  decides what to do based on review result
    const shouldMerge =
      reviewResult === 'APPROVED' || reviewResult === 'timed_out';

    if (shouldMerge) {
      await this.githubService.mergePR(prNumber);
      this.logger.log(`✅ PR #${prNumber} merged`);
      return `APPROVED prNumber=${prNumber}`;
    } else {
      return `NOT_APPROVED prNumber=${prNumber} result=${reviewResult}`;
    }
  }
}

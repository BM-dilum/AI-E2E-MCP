import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable, Logger } from '@nestjs/common';
import { createAgent } from 'langchain';
import { AIService } from 'src/ai/ai.service';
import { GithubService } from 'src/github/github.service';
import { GithubTools } from '../tools/github.tools';

@Injectable()
export class GithubReviewAgent {
  private readonly logger = new Logger(GithubReviewAgent.name);
  private llm: ChatGroq | ChatOpenAI;

  constructor(
    private githubTools: GithubTools,
    private githubService: GithubService,
    private aiService: AIService,
  ) {
    this.llm = this.aiService.getLLM();
  }

  async run(branch: string, prTitle: string) {
    this.logger.log(`🐙 GithubReviewAgent: branch=${branch}`);

    // Step 1: Agent opens PR only
    const openPRAgent = createAgent({
      model: this.llm,
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

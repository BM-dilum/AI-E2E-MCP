import { Injectable, Logger } from '@nestjs/common';
import { GithubService } from 'src/github/github.service';

@Injectable()
export class GithubReviewAgent {
  private readonly logger = new Logger(GithubReviewAgent.name);

  constructor(private githubService: GithubService) {}

  async run(branch: string, prTitle: string) {
    this.logger.log(`GithubReviewAgent: branch=${branch}`);

    const pr = await this.githubService.openPR(
      branch,
      prTitle,
      `Automated feature branch: ${branch}`,
    );
    const prNumber = pr.number;

    this.logger.log(`PR opened: #${prNumber}`);

    await this.githubService.triggerReview(prNumber);
    const reviewResult = await this.githubService.waitForReview(prNumber);

    this.logger.log(`Review result: ${reviewResult} for PR #${prNumber}`);

    const shouldMerge =
      reviewResult === 'APPROVED' || reviewResult === 'timed_out';

    if (shouldMerge) {
      await this.githubService.mergePR(prNumber);
      this.logger.log(`PR #${prNumber} merged`);
      return `APPROVED prNumber=${prNumber}`;
    }

    return `NOT_APPROVED prNumber=${prNumber} result=${reviewResult}`;
  }
}

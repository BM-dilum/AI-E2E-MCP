import { Injectable, Logger } from '@nestjs/common';
import { GithubService } from 'src/github/github.service';

@Injectable()
export class GithubReviewAgent {
  private readonly logger = new Logger(GithubReviewAgent.name);

  constructor(private githubService: GithubService) {}

  async run(branch: string, prTitle: string, repo: string, baseBranch: string) {
    this.logger.log(`GithubReviewAgent: repo=${repo}, branch=${branch}`);

    const pr = await this.githubService.openPR(
      branch,
      prTitle,
      `Automated feature branch: ${branch}`,
      repo,
      baseBranch,
    );
    const prNumber = pr.number;

    this.logger.log(`PR opened: #${prNumber}`);

    await this.githubService.triggerReview(prNumber, repo);
    const reviewResult = await this.githubService.waitForReview(prNumber, repo);

    this.logger.log(`Review result: ${reviewResult} for PR #${prNumber}`);

    const shouldMerge =
      reviewResult === 'APPROVED' || reviewResult === 'timed_out';

    if (shouldMerge) {
      await this.githubService.mergePR(prNumber, repo);
      this.logger.log(`PR #${prNumber} merged`);
      return `APPROVED prNumber=${prNumber}`;
    }

    return `NOT_APPROVED prNumber=${prNumber} result=${reviewResult}`;
  }
}

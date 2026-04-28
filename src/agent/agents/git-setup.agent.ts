import { Injectable, Logger } from '@nestjs/common';
import { GitService } from 'src/github/git.service';

@Injectable()
export class GitSetupAgent {
  private readonly logger = new Logger(GitSetupAgent.name);

  constructor(private gitService: GitService) {}

  async run(branch: string, repoPath?: string) {
    this.logger.log(`GitSetupAgent: branch=${branch}`);

    this.gitService.checkoutMain(repoPath);
    this.gitService.checkoutOrCreateBranch(branch, repoPath);

    const currentBranch = this.gitService.getCurrentBranch(repoPath);
    this.logger.log(`GitSetupAgent done: current branch=${currentBranch}`);

    return `CHECKED_OUT branch=${currentBranch}`;
  }
}

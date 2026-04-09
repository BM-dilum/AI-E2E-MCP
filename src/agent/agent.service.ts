import { Injectable, Logger } from '@nestjs/common';
import { GitService } from 'src/github/git.service';
import { AIService } from 'src/ai/ai.service';
import { GitSetupAgent } from './agents/git-setup.agent';
import { GithubFixAgent } from './agents/github-fix.agent';
import { GithubReviewAgent } from './agents/github-review.agent';
import { GitFixAgent } from './agents/git-fix-agent';
import { GithubService } from 'src/github/github.service';

export interface GeneratedFileSummary {
  path: string;
  exports: string; // just the exported types/functions, not implementation
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly maxFixRounds = 5;

  constructor(
    private gitSetupAgent: GitSetupAgent,
    private gitFixAgent: GitFixAgent,
    private githubReviewAgent: GithubReviewAgent,
    private githubFixAgent: GithubFixAgent,
    private aiService: AIService,
    private gitService: GitService,
    private githubService: GithubService,
  ) {}

  //helper function
  private extractExports(content: string): string {
    return content
      .split('\n')
      .filter(
        (line) =>
          line.startsWith('export') ||
          line.startsWith('interface') ||
          line.startsWith('type') ||
          line.startsWith('enum'),
      )
      .join('\n');
  }

  private isApprovedReviewResult(reviewResult: string): boolean {
    return /^approved\b/i.test(reviewResult.trim());
  }

  private isDoneFixResult(result: string): boolean {
    return /^done\b/i.test(result.trim());
  }

  async shipFeature(spec: string, repoPath?: string) {
    this.logger.log('🚀 shipFeature starting');

    // Stage 1: Plan
    const plan = await this.aiService.planFromSpec(spec);

    // Stage 2: Git setup
    await this.gitSetupAgent.run(plan.branch, repoPath);

    // Stage 2: Generate files
    const generatedSummaries: GeneratedFileSummary[] = [];
    for (const filePath of plan.filePaths) {
      const content = await this.aiService.generateFile(
        spec,
        filePath,
        plan,
        generatedSummaries,
      );
      const exports = this.extractExports(content);
      generatedSummaries.push({ path: filePath, exports });
      this.gitService.writeFile(filePath, content, repoPath);
    }

    // Stage 3b: Test + fix
    await this.gitFixAgent.run(
      plan.branch,
      plan.commitMessage,
      plan.filePaths,
      repoPath,
    );

    // Stage 4a: Open PR + review (happy path)
    const reviewResult = await this.githubReviewAgent.run(
      plan.branch,
      plan.prTitle,
    );

    const match = reviewResult.match(/prNumber=(\d+)/);
    const prNumber = match ? parseInt(match[1]) : null;

    this.logger.log(`📋 Review result: ${reviewResult}`);
    this.logger.log(`📋 PR number: ${prNumber}`);

    if (!prNumber) {
      this.logger.error('❌ Could not extract PR number');
      return { success: false, message: 'Could not extract PR number' };
    }

    // Stage 4b: Fix loop — only if needed
    if (!this.isApprovedReviewResult(reviewResult)) {
      for (let round = 1; round <= this.maxFixRounds; round++) {
        const { inline, general } =
          await this.githubService.getAllComments(prNumber);

        this.logger.log(
          `📋 Fix round ${round}/${this.maxFixRounds}: found ${inline.length} inline, ${general.length} general comments`,
        );

        if (inline.length === 0 && general.length === 0) {
          return {
            success: false,
            message: `PR #${prNumber} still needs review but no CodeRabbit comments were found`,
            prNumber,
            reviewResult,
          };
        }

        const fixResult = await this.githubFixAgent.run(
          plan.branch,
          prNumber,
          {
            inline,
            general,
          },
          repoPath,
        );

        this.logger.log(`📋 Fix result: ${fixResult}`);

        if (this.isDoneFixResult(fixResult)) {
          return { success: true, prNumber };
        }

        if (round === this.maxFixRounds) {
          return {
            success: false,
            message: `PR #${prNumber} still needs review after ${this.maxFixRounds} fix rounds`,
            prNumber,
            reviewResult,
            fixResult,
          };
        }
      }
    }

    return { success: true, prNumber };
  }

  // async fixAndMerge(prNumber: number, branch: string, repoPath?: string) {
  //   await this.githubFixAgent.run(branch, prNumber, repoPath);
  //   return { success: true };
  // }
}

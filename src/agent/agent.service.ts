import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitService } from 'src/github/git.service';
import { GroqService } from 'src/groq/groq.service';
import { GitSetupAgent } from './agents/git-setup.agent';
import { GithubFixAgent } from './agents/github-fix.agent';
import { GithubReviewAgent } from './agents/github-review.agent';
import { GitFixAgent } from './agents/git-fix-agent';

export interface GeneratedFileSummary {
  path: string;
  exports: string; // just the exported types/functions, not implementation
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private gitSetupAgent: GitSetupAgent,
    private gitFixAgent: GitFixAgent,
    private githubReviewAgent: GithubReviewAgent,
    private githubFixAgent: GithubFixAgent,
    private groqService: GroqService,
    private gitService: GitService,
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

  async shipFeature(spec: string, repoPath?: string) {
    this.logger.log('🚀 shipFeature starting');

    // Stage 1: Plan
    const plan = await this.groqService.planFromSpec(spec);

    // Stage 2: Git setup
    await this.gitSetupAgent.run(plan.branch, repoPath);

    // Stage 2: Generate files
    const generatedSummaries: GeneratedFileSummary[] = [];
    for (const filePath of plan.filePaths) {
      const content = await this.groqService.generateFile(
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

    // Stage 4b: Fix loop — only if needed
    if (!reviewResult.includes('approved')) {
      await this.githubFixAgent.run(plan.branch, repoPath);
    }

    return { success: true };
  }

  async fixAndMerge(prNumber: number, branch: string, repoPath?: string) {
    await this.githubFixAgent.run(branch, repoPath);
    return { success: true };
  }
}

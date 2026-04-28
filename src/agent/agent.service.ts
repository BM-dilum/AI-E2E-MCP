import { Injectable, Logger } from '@nestjs/common';
import { GitService } from 'src/github/git.service';
import { AIService } from 'src/ai/ai.service';
import { GitSetupAgent } from './agents/git-setup.agent';
import { GithubFixAgent } from './agents/github-fix.agent';
import { GithubReviewAgent } from './agents/github-review.agent';
import { GitFixAgent } from './agents/git-fix-agent';
import { GithubService } from 'src/github/github.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFileSummary {
  path: string;
  exports: string; // just the exported types/functions, not implementation
}

interface TargetRepoState {
  owner: string;
  repo: string;
  defaultBranch: string;
  localPath: string;
  workPath: string;
  targetSubdir?: string;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly maxFixRounds = 50;

  constructor(
    private gitSetupAgent: GitSetupAgent,
    private gitFixAgent: GitFixAgent,
    private githubReviewAgent: GithubReviewAgent,
    private githubFixAgent: GithubFixAgent,
    private aiService: AIService,
    private gitService: GitService,
    private githubService: GithubService,
    private configService: ConfigService,
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
    return /^approved\b/i.test(result.trim());
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private getWorkspaceRoot(repoPath?: string): string {
    return (
      repoPath ||
      this.configService.get<string>('TARGET_REPO_ROOT') ||
      path.join(process.cwd(), 'generated_repos')
    );
  }

  private getStatePath(workspaceRoot: string): string {
    return path.join(workspaceRoot, '.ai-e2e-target.json');
  }

  private parseTargetFromSpec(spec: string): {
    repo: string;
    targetSubdir?: string;
  } {
    const targetLocation = spec.match(
      /^# TARGET LOCATION\s*\n([^\n\r]+)/im,
    )?.[1];

    if (targetLocation) {
      const parts = targetLocation
        .replace(/\\/g, '/')
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean);
      const repoIndex =
        parts.length >= 2 && /^test[_-]?repo$/i.test(parts[0]) ? 1 : 0;
      const repo = this.slugify(parts[repoIndex] || parts[0]);
      const targetSubdir = parts.slice(repoIndex + 1).join(path.sep);

      if (repo) {
        return { repo, targetSubdir: targetSubdir || undefined };
      }
    }

    const title =
      spec.match(/^# SPEC TITLE\s*\n([^\n\r]+)/im)?.[1] ||
      spec.match(/^# TASK\s*\n([^\n\r]+)/im)?.[1] ||
      'generated-project';

    return { repo: this.slugify(title) };
  }

  private readTargetState(workspaceRoot: string): TargetRepoState | null {
    const statePath = this.getStatePath(workspaceRoot);
    if (!fs.existsSync(statePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(statePath, 'utf8').trim();
      if (!raw) {
        this.logger.warn(`Ignoring empty target state file: ${statePath}`);
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<TargetRepoState>;
      if (
        !parsed.owner ||
        !parsed.repo ||
        !parsed.defaultBranch ||
        !parsed.localPath ||
        !parsed.workPath
      ) {
        this.logger.warn(`Ignoring invalid target state file: ${statePath}`);
        return null;
      }

      return parsed as TargetRepoState;
    } catch (error: any) {
      this.logger.warn(
        `Ignoring unreadable target state file ${statePath}: ${error.message}`,
      );
      return null;
    }
  }

  private writeTargetState(workspaceRoot: string, state: TargetRepoState) {
    fs.mkdirSync(workspaceRoot, { recursive: true });
    fs.writeFileSync(
      this.getStatePath(workspaceRoot),
      JSON.stringify(state, null, 2),
      'utf8',
    );
  }

  private async resolveTargetRepo(
    spec: string,
    workspaceRoot: string,
  ): Promise<TargetRepoState> {
    const existing = this.readTargetState(workspaceRoot);
    if (existing) {
      await this.githubService.ensureRepository(existing.repo);
      this.gitService.cloneRepository(
        `https://github.com/${existing.owner}/${existing.repo}.git`,
        existing.localPath,
      );
      return existing;
    }

    const parsed = this.parseTargetFromSpec(spec);
    const remote = await this.githubService.ensureRepository(parsed.repo);
    const localPath = path.join(workspaceRoot, parsed.repo);
    const workPath = parsed.targetSubdir
      ? path.join(localPath, parsed.targetSubdir)
      : localPath;

    this.gitService.cloneRepository(remote.cloneUrl, localPath);
    fs.mkdirSync(workPath, { recursive: true });

    const state: TargetRepoState = {
      owner: remote.owner,
      repo: remote.repo,
      defaultBranch: remote.defaultBranch,
      localPath,
      workPath,
      targetSubdir: parsed.targetSubdir,
    };

    this.writeTargetState(workspaceRoot, state);
    return state;
  }

  async shipFeature(spec: string, repoPath?: string) {
    this.logger.log('🚀 shipFeature starting');

    // Stage 1: Plan
    const plan = await this.aiService.planFromSpec(spec);
    const workspaceRoot = this.getWorkspaceRoot(repoPath);
    const targetRepo = await this.resolveTargetRepo(spec, workspaceRoot);

    // Stage 2: Git setup
    await this.gitSetupAgent.run(
      plan.branch,
      targetRepo.defaultBranch,
      targetRepo.workPath,
    );

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
      this.gitService.writeFile(filePath, content, targetRepo.workPath);
    }

    // Stage 3b: Test + fix
    let gitFixResult = '';
    let testsPassed = false;
    for (let round = 1; round <= this.maxFixRounds; round++) {
      gitFixResult = await this.gitFixAgent.run(
        plan.branch,
        plan.commitMessage,
        plan.filePaths,
        targetRepo.workPath,
      );

      testsPassed = this.gitService.runTests(targetRepo.workPath);
      if (testsPassed) {
        break;
      }

      this.logger.warn(
        `Tests are still failing after fix round ${round}/${this.maxFixRounds}`,
      );
    }

    if (!testsPassed) {
      this.logger.error(
        'Tests are still failing after GitFixAgent; blocking push and PR creation',
      );
      return {
        success: false,
        message:
          'Tests are still failing after GitFixAgent; blocked push and PR creation',
        gitFixResult,
      };
    }

    const pushed = this.gitService.commitAndPush(
      plan.branch,
      plan.commitMessage,
      targetRepo.workPath,
    );
    if (!pushed) {
      this.logger.error('Could not push tested changes; blocking PR creation');
      return {
        success: false,
        message: 'Could not push tested changes; blocked PR creation',
        gitFixResult,
      };
    }

    // Stage 4a: Open PR + review (happy path)
    const reviewResult = await this.githubReviewAgent.run(
      plan.branch,
      plan.prTitle,
      targetRepo.repo,
      targetRepo.defaultBranch,
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
        const { inline, general } = await this.githubService.getAllComments(
          prNumber,
          targetRepo.repo,
        );

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
          targetRepo.workPath,
          targetRepo.repo,
        );

        this.logger.log(`📋 Fix result: ${fixResult}`);

        if (this.isDoneFixResult(fixResult)) {
          await this.githubService.mergePR(prNumber, targetRepo.repo);
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

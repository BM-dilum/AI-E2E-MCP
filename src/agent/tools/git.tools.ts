import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { GitService } from 'src/github/git.service';
import { GroqService } from 'src/groq/groq.service';

@Injectable()
export class GitTools {
  constructor(
    private gitService: GitService,
    private groqService: GroqService,
  ) {}

  checkoutMain(repoPath?: string) {
    return tool(
      async () => {
        this.gitService.checkoutMain(repoPath);
        return 'Checked out main';
      },
      {
        name: 'checkout_main',
        description: 'Checkout main branch and pull latest',
        schema: z.object({}),
      },
    );
  }

  createBranch(repoPath?: string) {
    return tool(
      async ({ branch }) => {
        this.gitService.createBranch(branch, repoPath);
        return `Created branch ${branch}`;
      },
      {
        name: 'create_branch',
        description: 'Create a new git branch',
        schema: z.object({ branch: z.string() }),
      },
    );
  }

  installDeps() {
    return tool(
      async () => {
        this.gitService.installDependencies();
        return 'Dependencies installed';
      },
      {
        name: 'install_dependencies',
        description: 'Run npm install',
        schema: z.object({}),
      },
    );
  }

  runTests(repoPath?: string) {
    return tool(
      async () => {
        const passed = this.gitService.runTests(repoPath);
        return passed ? 'TESTS_PASSED' : 'TESTS_FAILED';
      },
      {
        name: 'run_tests',
        description: 'Run tests — returns TESTS_PASSED or TESTS_FAILED',
        schema: z.object({}),
      },
    );
  }

  fixFile(repoPath?: string) {
    return tool(
      async ({ filePath, issues }) => {
        const content = this.gitService.readFile(filePath, repoPath);
        const fixed = await this.groqService.fixFile(filePath, content, issues);
        if (!fixed) return 'FAILED';
        this.gitService.writeFile(filePath, fixed, repoPath);
        return `FIXED: ${filePath}`;
      },
      {
        name: 'fix_file',
        description: 'Fix a file based on issues',
        schema: z.object({
          filePath: z.string(),
          issues: z.string(),
        }),
      },
    );
  }

  commitAndPush(repoPath?: string) {
    return tool(
      async ({ branch, message }) => {
        const pushed = this.gitService.commitAndPush(branch, message, repoPath);
        return pushed ? 'PUSHED' : 'NOTHING_TO_PUSH';
      },
      {
        name: 'commit_and_push',
        description: 'Commit and push to GitHub',
        schema: z.object({
          branch: z.string(),
          message: z.string(),
        }),
      },
    );
  }
}

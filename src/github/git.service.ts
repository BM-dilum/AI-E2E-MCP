import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);

  constructor(private configService: ConfigService) {}

  private getBaseBranch(): string {
    const configured =
      this.configService.get<string>('GITHUB_BASE_BRANCH') ||
      this.configService.get<string>('GITHUB_PR_BASE_BRANCH');

    if (configured && !['repo_branch', 'empty_branch'].includes(configured)) {
      return configured;
    }

    return 'dev';
  }

  private getRepoPath(repoPath?: string): string {
    return (
      repoPath ?? this.configService.get<string>('REPO_PATH') ?? process.cwd()
    );
  }

  getCurrentBranch(repoPath?: string): string {
    const root = this.getRepoPath(repoPath);
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: root,
    })
      .toString()
      .trim();
  }

  //checkout to main and pull request
  checkoutMain(repoPath?: string) {
    const root = this.getRepoPath(repoPath);
    const baseBranch = this.getBaseBranch();
    execSync(`git checkout ${baseBranch}`, { cwd: root });
    execSync(`git pull origin ${baseBranch}`, { cwd: root });
  }

  checkoutBaseBranch(baseBranch: string, repoPath?: string) {
    const root = this.getRepoPath(repoPath);
    execSync(`git checkout ${baseBranch}`, { cwd: root });
    execSync(`git pull origin ${baseBranch}`, { cwd: root });
  }

  //create a branch
  createBranch(branch: string, repoPath?: string) {
    const root = this.getRepoPath(repoPath);
    execSync(`git checkout -b ${branch}`, { cwd: root });
  }

  checkoutOrCreateBranch(branch: string, repoPath?: string) {
    const root = this.getRepoPath(repoPath);
    this.exec(`git checkout -B ${branch}`, root);
    const currentBranch = this.getCurrentBranch(repoPath);
    if (currentBranch !== branch) {
      throw new Error(
        `Expected to be on ${branch}, but current branch is ${currentBranch}`,
      );
    }
    this.logger.log(`Checked out feature branch: ${currentBranch}`);
  }

  checkoutFeatureBranch(branch: string, baseBranch: string, repoPath?: string) {
    this.checkoutBaseBranch(baseBranch, repoPath);
    this.checkoutOrCreateBranch(branch, repoPath);
  }

  isGitRepo(repoPath: string): boolean {
    try {
      execSync('git rev-parse --show-toplevel', {
        cwd: repoPath,
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  }

  cloneRepository(cloneUrl: string, destinationPath: string) {
    const parent = path.dirname(destinationPath);
    fs.mkdirSync(parent, { recursive: true });

    if (fs.existsSync(destinationPath) && this.isGitRepo(destinationPath)) {
      this.logger.log(`Repository already cloned: ${destinationPath}`);
      return;
    }

    if (fs.existsSync(destinationPath)) {
      throw new Error(
        `Cannot clone into ${destinationPath}: path exists but is not a git repository`,
      );
    }

    execSync(`git clone ${cloneUrl} "${destinationPath}"`, {
      cwd: parent,
      stdio: 'inherit',
    });
  }

  // checkout existing branch
  checkout(branch: string) {
    this.logger.log(`Checking out ${branch}`);
    this.exec(`git checkout ${branch}`);
    this.exec(`git pull origin ${branch}`);
  }

  readFile(filePath: string, repoPath?: string): string {
    const root = this.getRepoPath(repoPath);
    const fullPath = path.join(root, filePath);
    this.logger.log(`Reading ${fullPath}`);
    return fs.readFileSync(fullPath, 'utf8');
  }

  //write file to local disk
  writeFile(filePath: string, content: string, repoPath?: string) {
    const root = this.getRepoPath(repoPath);
    const fullPath = path.join(root, filePath);

    //create dir if it does not exist
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.logger.log(`Created directory: ${dir}`);
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    this.logger.log(`✅ Written: ${fullPath}`);
  }

  // check if file exists
  fileExists(filePath: string, repoPath?: string): boolean {
    const root = this.getRepoPath(repoPath);
    const fullPath = path.join(root, filePath);
    return fs.existsSync(fullPath);
  }

  // install dependencies
  installDependencies(repoPath?: string) {
    const root = this.getRepoPath(repoPath);
    this.logger.log('Installing dependencies...');
    try {
      this.exec('npm install', root);
      this.logger.log('✅ Dependencies installed');
    } catch {
      this.logger.warn('⚠️ npm install failed — continuing');
    }
  }

  // run tests
  runTests(repoPath?: string): boolean {
    const root = this.getRepoPath(repoPath);
    try {
      // Detect framework by checking package.json
      const pkgPath = path.join(root, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      if (pkg.scripts) {
        if (!pkg.scripts.test) {
          this.logger.error('package.json is missing required test script');
          return false;
        }

        if (!pkg.scripts.build) {
          this.logger.error('package.json is missing required build script');
          return false;
        }

        const testsPassed = this.exec('npm test', root);
        if (!testsPassed) {
          return false;
        }

        return this.exec('npm run build', root);
      }

      // Detect by dependencies
      if (pkg.devDependencies?.jest || pkg.dependencies?.jest) {
        return this.exec('npx jest', root);
      }

      if (pkg.devDependencies?.mocha) {
        return this.exec('npx mocha', root);
      }

      if (pkg.devDependencies?.vitest) {
        return this.exec('npx vitest run', root);
      }

      // Hardhat/Foundry for Solidity
      if (pkg.devDependencies?.hardhat) {
        return this.exec('npx hardhat test', root);
      }
      if (fs.existsSync(path.join(root, 'foundry.toml'))) {
        return this.exec('forge test', root);
      }

      this.logger.error('package.json is missing required scripts object');
      return false;
    } catch (error) {
      this.logger.error('❌ tests failed');
      return false;
    }
  }

  //check if there are changes to commit
  hasChanges(repoPath?: string): boolean {
    try {
      const root = this.getRepoPath(repoPath);
      this.exec('git add .');
      const diff = execSync(`git -C ${root} diff --staged`).toString();
      return diff.length > 0;
    } catch {
      return false;
    }
  }

  // commit and push
  commitAndPush(branch: string, message: string, repoPath?: string): boolean {
    const root = this.getRepoPath(repoPath);
    try {
      execSync('git add .', { cwd: root });

      const diff = execSync(`git diff --staged`, { cwd: root }).toString();
      if (diff.length === 0) {
        this.logger.log('⚠️ No staged changes to commit; pushing branch');
        return this.exec(`git push origin ${branch}`, root);
      }

      const committed = this.exec(`git commit -m "${message}"`, root);
      if (!committed) {
        return false;
      }

      const pushed = this.exec(`git push origin ${branch}`, root);
      if (!pushed) {
        return false;
      }

      this.logger.log(`✅ Pushed to ${branch}`);
      return true;
    } catch (error) {
      this.logger.error('❌ Falied to commit/push');
      return false;
    }
  }

  private exec(command: string, repoPath?: string): boolean {
    this.logger.log(`$ ${command}`);
    const root = this.getRepoPath(repoPath);
    try {
      execSync(command, {
        cwd: root,
        stdio: 'inherit',
      });
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to execute command : ${command}`);
      return false;
    }
  }

  pushBranch(branch: string, repoPath?: string) {
    const root = this.getRepoPath(repoPath);
    execSync(`git push -u origin ${branch}`, { cwd: root });
  }
}

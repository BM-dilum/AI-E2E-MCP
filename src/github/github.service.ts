import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from 'octokit';

export interface PullRequest {
  number: number;
  html_url: string;
  state: string;
  head: { ref: string };
}

export interface Comment {
  id: number;
  path: string;
  line?: number;
  body: string;
  user: { login: string };
}

export interface TargetRepository {
  owner: string;
  repo: string;
  cloneUrl: string;
  htmlUrl: string;
  defaultBranch: string;
}

interface LatestCodeRabbitReview {
  id: number | null;
  submittedAt: string | null;
}

@Injectable()
export class GithubService {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;
  private readonly baseBranch: string;
  private readonly logger = new Logger(GithubService.name);

  constructor(private configService: ConfigService) {
    this.octokit = new Octokit({
      auth: this.configService.getOrThrow('GITHUB_TOKEN'),
    });

    this.owner = this.configService.getOrThrow('GITHUB_OWNER');
    this.repo = this.configService.getOrThrow('GITHUB_REPO');
    const configuredBase =
      this.configService.get<string>('GITHUB_BASE_BRANCH') ||
      this.configService.get<string>('GITHUB_PR_BASE_BRANCH');
    this.baseBranch =
      configuredBase &&
      !['repo_branch', 'empty_branch'].includes(configuredBase)
        ? configuredBase
        : 'dev';
  }

  getOwner(): string {
    return this.owner;
  }

  getConfiguredRepo(): string {
    return this.repo;
  }

  getBaseBranch(): string {
    return this.baseBranch;
  }

  async ensureRepository(repo: string): Promise<TargetRepository> {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner: this.owner,
        repo,
      });

      return {
        owner: this.owner,
        repo,
        cloneUrl: data.clone_url,
        htmlUrl: data.html_url,
        defaultBranch: data.default_branch,
      };
    } catch (error: any) {
      if (error?.status !== 404) {
        throw error;
      }
    }

    const { data: user } = await this.octokit.rest.users.getAuthenticated();
    const { data } =
      user.login === this.owner
        ? await this.octokit.rest.repos.createForAuthenticatedUser({
            name: repo,
            private: false,
            auto_init: true,
          })
        : await this.octokit.rest.repos.createInOrg({
            org: this.owner,
            name: repo,
            private: false,
            auto_init: true,
          });

    this.logger.log(`Created GitHub repository: ${data.full_name}`);

    return {
      owner: this.owner,
      repo,
      cloneUrl: data.clone_url,
      htmlUrl: data.html_url,
      defaultBranch: data.default_branch,
    };
  }

  async openPR(
    branch: string,
    title: string,
    body: string,
    repo = this.repo,
    base = this.baseBranch,
  ): Promise<PullRequest> {
    this.logger.log(`Opening PR in ${this.owner}/${repo}: ${title}`);

    const { data: pr } = await this.octokit.rest.pulls.create({
      owner: this.owner,
      repo,
      title,
      head: branch,
      base,
      body,
    });

    this.logger.log(`PR opened: ${pr.html_url} (${branch} -> ${base})`);
    return pr as PullRequest;
  }

  async getPR(prNumber: number, repo = this.repo): Promise<PullRequest> {
    const { data } = await this.octokit.rest.pulls.get({
      owner: this.owner,
      repo,
      pull_number: prNumber,
    });

    return data as PullRequest;
  }

  private async getLatestCodeRabbitReview(
    prNumber: number,
    repo = this.repo,
  ): Promise<LatestCodeRabbitReview> {
    const { data: reviews } = await this.octokit.rest.pulls.listReviews({
      owner: this.owner,
      repo,
      pull_number: prNumber,
    });

    const coderabbitReviews = reviews.filter((review) =>
      review.user?.login.includes('coderabbit'),
    );

    if (coderabbitReviews.length === 0) {
      return { id: null, submittedAt: null };
    }

    const latest = coderabbitReviews[coderabbitReviews.length - 1];
    return {
      id: latest.id,
      submittedAt: latest.submitted_at ?? null,
    };
  }

  async getInlineComments(
    prNumber: number,
    reviewId?: number | null,
    repo = this.repo,
  ): Promise<Comment[]> {
    const { data } = await this.octokit.rest.pulls.listReviewComments({
      owner: this.owner,
      repo,
      pull_number: prNumber,
    });

    const comments = data.filter(
      (comment) =>
        comment.user?.login.includes('coderabbit') &&
        (reviewId == null || comment.pull_request_review_id === reviewId),
    );

    this.logger.log(`Found ${comments.length} inline CodeRabbit comments`);
    return comments as Comment[];
  }

  async getGeneralComments(
    prNumber: number,
    submittedAt?: string | null,
    repo = this.repo,
  ): Promise<any[]> {
    const { data } = await this.octokit.rest.issues.listComments({
      owner: this.owner,
      repo,
      issue_number: prNumber,
    });

    const submittedTime = submittedAt ? new Date(submittedAt).getTime() : null;
    const comments = data.filter((comment) => {
      if (!comment.user?.login.includes('coderabbit')) {
        return false;
      }

      if (submittedTime == null) {
        return true;
      }

      return new Date(comment.created_at).getTime() >= submittedTime;
    });

    this.logger.log(`Found ${comments.length} general CodeRabbit comments`);
    return comments;
  }

  async getAllComments(prNumber: number, repo = this.repo) {
    const latestReview = await this.getLatestCodeRabbitReview(prNumber, repo);
    const inline = await this.getInlineComments(
      prNumber,
      latestReview.id,
      repo,
    );
    const general = await this.getGeneralComments(
      prNumber,
      latestReview.submittedAt,
      repo,
    );
    return { inline, general };
  }

  async getThreadIds(
    prNumber: number,
    repo = this.repo,
  ): Promise<Map<number, string>> {
    const threadMap = new Map<number, string>();

    const query = `
      query getThreads($owner: String!, $repo: String!, $prNumber: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $prNumber) {
            reviewThreads(first: 100) {
              nodes {
                id
                isResolved
                comments(first: 50) {
                  nodes {
                    databaseId
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result: any = await this.octokit.graphql(query, {
      owner: this.owner,
      repo,
      prNumber,
    });

    const threads = result.repository.pullRequest.reviewThreads.nodes;
    for (const thread of threads) {
      if (!thread.isResolved && thread.comments.nodes.length > 0) {
        const commentId = thread.comments.nodes[0].databaseId;
        threadMap.set(commentId, thread.id);
      }
    }

    this.logger.log(`Found ${threadMap.size} unresolved threads`);
    return threadMap;
  }

  async replyToComment(
    prNumber: number,
    commentId: number,
    body: string,
    repo = this.repo,
  ) {
    await this.octokit.rest.pulls.createReplyForReviewComment({
      owner: this.owner,
      repo,
      pull_number: prNumber,
      comment_id: commentId,
      body,
    });

    this.logger.log(`Replied to comment ${commentId}`);
  }

  async resolveThread(threadId: string) {
    await this.octokit.graphql(
      `
        mutation resolveThread($threadId: ID!) {
          resolveReviewThread(input : { threadId : $threadId}) {
            thread {
              id
              isResolved
            }
          }
        }
      `,
      { threadId },
    );
    this.logger.log(`Resolved thread ${threadId}`);
  }

  async resolveComments(
    prNumber: number,
    comments: Comment[],
    fixedFiles: string[],
    repo = this.repo,
  ) {
    const threadMap = await this.getThreadIds(prNumber, repo);
    const latestReview = await this.getLatestCodeRabbitReview(prNumber, repo);
    const latestInlineComments = await this.getInlineComments(
      prNumber,
      latestReview.id,
      repo,
    );
    const commentsToResolve = comments.filter(
      (comment) => typeof comment?.id === 'number' && comment.path,
    );
    const resolvableComments =
      commentsToResolve.length > 0 ? commentsToResolve : latestInlineComments;
    const filesToResolve =
      fixedFiles.length > 0
        ? new Set(fixedFiles)
        : new Set(
            resolvableComments.map((comment) => comment.path).filter(Boolean),
          );

    for (const comment of resolvableComments) {
      if (filesToResolve.has(comment.path)) {
        try {
          await this.replyToComment(
            prNumber,
            comment.id,
            'Fixed in latest commit',
            repo,
          );

          const threadId = threadMap.get(comment.id);
          if (threadId) {
            await this.resolveThread(threadId);
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to resolve comment ${comment.id}: ${error.message}`,
          );
        }
      }
    }
  }

  async triggerReview(prNumber: number, repo = this.repo) {
    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo,
      issue_number: prNumber,
      body: '@coderabbitai review',
    });

    this.logger.log(`Triggered CodeRabbit review for PR #${prNumber}`);
  }

  async waitForReview(
    prNumber: number,
    repo = this.repo,
    timeoutMs = 600000,
  ): Promise<string> {
    this.logger.log('Waiting for CodeRabbit review...');

    const interval = 30000;
    const maxAttempts = timeoutMs / interval;
    let attempts = 0;
    let lastReviewId = 0;

    const { data: existing } = await this.octokit.rest.pulls.listReviews({
      owner: this.owner,
      repo,
      pull_number: prNumber,
    });

    const existingCoderabbit = existing.filter((review) =>
      review.user?.login.includes('coderabbit'),
    );

    if (existingCoderabbit.length > 0) {
      lastReviewId = existingCoderabbit[existingCoderabbit.length - 1].id;
    }

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      attempts++;

      const { data: reviews } = await this.octokit.rest.pulls.listReviews({
        owner: this.owner,
        repo,
        pull_number: prNumber,
      });

      const coderabbitReviews = reviews.filter(
        (review) =>
          review.user?.login.includes('coderabbit') && review.id > lastReviewId,
      );

      if (coderabbitReviews.length > 0) {
        const latest = coderabbitReviews[coderabbitReviews.length - 1];
        this.logger.log(`CodeRabbit state: ${latest.state}`);
        return latest.state;
      }

      this.logger.log(`Still waiting... attempt ${attempts}/${maxAttempts}`);
    }

    this.logger.warn('Timed out waiting for review');
    return 'timed_out';
  }

  async mergePR(prNumber: number, repo = this.repo) {
    const { data } = await this.octokit.rest.pulls.merge({
      owner: this.owner,
      repo,
      pull_number: prNumber,
      merge_method: 'squash',
    });

    if (!data.merged) {
      throw new Error(
        `GitHub did not merge PR #${prNumber}: ${data.message ?? 'unknown error'}`,
      );
    }

    this.logger.log(`Merged PR #${prNumber}: ${data.sha}`);
  }

  async postComment(prNumber: number, body: string, repo = this.repo) {
    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo,
      issue_number: prNumber,
      body,
    });
  }

  async getBranch(branch: string, repo = this.repo) {
    return this.octokit.rest.repos.getBranch({
      owner: this.owner,
      repo,
      branch,
    });
  }
}

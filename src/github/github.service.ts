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

interface LatestCodeRabbitReview {
  id: number | null;
  submittedAt: string | null;
  state: string | null;
}

@Injectable()
export class GithubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private baseBranch: string;
  private readonly logger = new Logger(GithubService.name);

  constructor(private configService: ConfigService) {
    this.octokit = new Octokit({
      auth: this.configService.getOrThrow('GITHUB_TOKEN'),
    });

    this.owner = this.configService.getOrThrow('GITHUB_OWNER');
    this.repo = this.configService.getOrThrow('GITHUB_REPO');
    this.baseBranch =
      this.configService.get<string>('GITHUB_BASE_BRANCH') || 'dev';
  }

  //open new PR
  async openPR(
    branch: string,
    title: string,
    body: string,
  ): Promise<PullRequest> {
    this.logger.log(`Openning PR: ${title}`);

    const { data: pr } = await this.octokit.rest.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title,
      head: branch,
      base: this.baseBranch,
      body,
    });

    this.logger.log(
      `✅ PR opened: ${pr.html_url} (${branch} -> ${this.baseBranch})`,
    );
    return pr as PullRequest;
  }

  //get PR details
  async getPR(prNumber: number): Promise<PullRequest> {
    const { data } = await this.octokit.rest.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    return data as PullRequest;
  }

  private async getLatestCodeRabbitReview(
    prNumber: number,
  ): Promise<LatestCodeRabbitReview> {
    const { data: reviews } = await this.octokit.rest.pulls.listReviews({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    const coderabbitReviews = reviews.filter((review) =>
      review.user?.login.includes('coderabbit'),
    );

    if (coderabbitReviews.length === 0) {
      return { id: null, submittedAt: null, state: null };
    }

    const latest = coderabbitReviews[coderabbitReviews.length - 1];
    return {
      id: latest.id,
      submittedAt: latest.submitted_at ?? null,
      state: latest.state ?? null,
    };
  }

  async getLatestCodeRabbitReviewState(
    prNumber: number,
  ): Promise<string | null> {
    const latestReview = await this.getLatestCodeRabbitReview(prNumber);
    return latestReview.state;
  }

  async isCodeRabbitApproved(prNumber: number): Promise<boolean> {
    const state = await this.getLatestCodeRabbitReviewState(prNumber);
    return state?.toUpperCase() === 'APPROVED';
  }

  //get all unresolved coderabbit pr comments
  async getInlineComments(
    prNumber: number,
    reviewId?: number | null,
  ): Promise<Comment[]> {
    const { data } = await this.octokit.rest.pulls.listReviewComments({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    const comments = data.filter(
      (c) =>
        c.user?.login.includes('coderabbit') &&
        (reviewId == null || c.pull_request_review_id === reviewId),
    );

    this.logger.log(`Found ${comments.length} inline CodeRabbit comments`);
    return comments;
  }

  //get all coderabbit comments (nitpicks)
  async getGeneralComments(
    prNumber: number,
    submittedAt?: string | null,
  ): Promise<any[]> {
    const { data } = await this.octokit.rest.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
    });

    const submittedTime = submittedAt ? new Date(submittedAt).getTime() : null;
    const comments = data.filter((c) => {
      if (!c.user?.login.includes('coderabbit')) {
        return false;
      }

      if (submittedTime == null) {
        return true;
      }

      return new Date(c.created_at).getTime() >= submittedTime;
    });

    this.logger.log(`Found ${comments.length} general CodeRabbit comments`);
    return comments;
  }

  //get all Coderabbit comments (inline + general)
  async getAllComments(prNmber: number) {
    const latestReview = await this.getLatestCodeRabbitReview(prNmber);
    const inline = await this.getInlineComments(prNmber, latestReview.id);
    const general = await this.getGeneralComments(
      prNmber,
      latestReview.submittedAt,
    );
    return { inline, general };
  }

  //get thread IDs resolving via GraphQL
  async getThreadIds(prNumber: number): Promise<Map<number, string>> {
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
      repo: this.repo,
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

  //reply to inline comments
  async replyToComment(prNumber: number, commentId: number, body: string) {
    await this.octokit.rest.pulls.createReplyForReviewComment({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      comment_id: commentId,
      body,
    });

    this.logger.log(`Replied to comment ${commentId}`);
  }

  //resolve a thread via GraphQL
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
    this.logger.log(`✅ Resolved thread ${threadId}`);
  }

  //resolve all comments for fixed files
  async resolveComments(
    prNumber: number,
    comments: Comment[],
    fixedFiles: string[],
  ) {
    const threadMap = await this.getThreadIds(prNumber);
    const latestReview = await this.getLatestCodeRabbitReview(prNumber);
    const latestInlineComments = await this.getInlineComments(
      prNumber,
      latestReview.id,
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
            '✅ Fixed in latest commit',
          );

          const threadId = threadMap.get(comment.id);
          if (threadId) {
            await this.resolveThread(threadId);
          }
        } catch (error) {
          this.logger.error(
            `Failed to resolve comment ${comment.id}: ${error.message}`,
          );
        }
      }
    }
  }

  //trigger coderabbit review
  async triggerReview(prNumber: number) {
    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body: '@coderabbitai review',
    });

    this.logger.log(`Triggered CodeRabbit review for PR #${prNumber}`);
  }

  //wait for CodeRabbit to submit a review
  async waitForReview(
    prNumber: number,
    timeoutMs = 600000,
    acceptExistingApproval = false,
  ): Promise<string> {
    this.logger.log('⏳ Waiting for CodeRabbit review...');

    const interval = 30000;
    const maxAttempts = timeoutMs / interval;
    let attempts = 0;
    let lastReviewId = 0;

    // get current latest review ID to detect NEW reviews
    const { data: existing } = await this.octokit.rest.pulls.listReviews({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    const existingCoderabbit = existing.filter((r) =>
      r.user?.login.includes('coderabbit'),
    );

    if (existingCoderabbit.length > 0) {
      const latestExisting = existingCoderabbit[existingCoderabbit.length - 1];
      lastReviewId = latestExisting.id;

      if (
        acceptExistingApproval &&
        latestExisting.state?.toUpperCase() === 'APPROVED'
      ) {
        this.logger.log('CodeRabbit already approved this PR');
        return 'APPROVED';
      }
    }

    //poll for new review
    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, interval));
      attempts++;

      const { data: reviews } = await this.octokit.rest.pulls.listReviews({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
      });

      const coderabbitReviews = reviews.filter(
        (r) => r.user?.login.includes('coderabbit') && r.id > lastReviewId,
      );

      if (coderabbitReviews.length > 0) {
        const latest = coderabbitReviews[coderabbitReviews.length - 1];
        this.logger.log(`📋 CodeRabbit state: ${latest.state}`);
        return latest.state;
      }

      const latestCodeRabbitReview = reviews
        .filter((r) => r.user?.login.includes('coderabbit'))
        .at(-1);
      if (
        acceptExistingApproval &&
        latestCodeRabbitReview?.state?.toUpperCase() === 'APPROVED'
      ) {
        this.logger.log('CodeRabbit approved this PR');
        return 'APPROVED';
      }

      this.logger.log(`⏳ Still waiting... attempt ${attempts}/${maxAttempts}`);
    }
    this.logger.warn('⏰ Timed out waiting for review');
    return 'timed_out';
  }

  // merge the PR
  async mergePR(prNumber: number) {
    const { data } = await this.octokit.rest.pulls.merge({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      merge_method: 'squash',
    });

    if (!data.merged) {
      throw new Error(
        `GitHub did not merge PR #${prNumber}: ${data.message ?? 'unknown error'}`,
      );
    }

    this.logger.log(`✅ Merged PR #${prNumber}: ${data.sha}`);
  }

  async postComment(prNumber: number, body: string) {
    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body,
    });
  }

  async getBranch(branch: string) {
    return this.octokit.rest.repos.getBranch({
      owner: this.owner,
      repo: this.repo,
      branch,
    });
  }
}

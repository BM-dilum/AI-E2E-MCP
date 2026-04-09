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

@Injectable()
export class GithubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private readonly logger = new Logger(GithubService.name);

  constructor(private configService: ConfigService) {
    this.octokit = new Octokit({
      auth: this.configService.getOrThrow('GITHUB_TOKEN'),
    });

    this.owner = this.configService.getOrThrow('GITHUB_OWNER');
    this.repo = this.configService.getOrThrow('GITHUB_REPO');
  }

  /**
   * Normalize a comment body for comparison by collapsing whitespace and trimming.
   */
  private normalizeCommentBody(body?: string | null): string {
    return (body ?? '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Remove duplicate inline comments using path, line, and normalized body as the uniqueness key.
   */
  private dedupeInlineComments<T extends Comment>(comments: T[]): T[] {
    const unique = new Map<string, T>();

    for (const comment of comments) {
      const key = [
        comment.path,
        comment.line ?? '',
        this.normalizeCommentBody(comment.body),
      ].join('|');
      unique.set(key, comment);
    }

    return [...unique.values()];
  }

  /**
   * Remove duplicate general comments using the normalized body as the uniqueness key.
   */
  private dedupeGeneralComments<T extends { body?: string | null; id: number }>(
    comments: T[],
  ): T[] {
    const unique = new Map<string, T>();

    for (const comment of comments) {
      const key = this.normalizeCommentBody(comment.body);
      unique.set(key, comment);
    }

    return [...unique.values()];
  }

  /**
   * Open a new pull request from the given branch.
   */
  async openPR(
    branch: string,
    title: string,
    body: string,
  ): Promise<PullRequest> {
    this.logger.log(`Openning PR: ${title}`);

    const { data: repoData } = await this.octokit.rest.repos.get({
      owner: this.owner,
      repo: this.repo,
    });

    const { data: pr } = await this.octokit.rest.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title,
      head: branch,
      base: repoData.default_branch,
      body,
    });

    this.logger.log(`✅ PR opened: ${pr.html_url}`);
    return pr as PullRequest;
  }

  /**
   * Fetch pull request details by PR number.
   */
  async getPR(prNumber: number): Promise<PullRequest> {
    const { data } = await this.octokit.rest.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    return data as PullRequest;
  }

  /**
   * Get all unresolved inline CodeRabbit comments for a pull request.
   */
  async getInlineComments(prNumber: number): Promise<Comment[]> {
    const reviewComments = (await this.octokit.paginate(
      this.octokit.rest.pulls.listReviewComments,
      {
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        per_page: 100,
      },
    )) as any[];

    const reviews = (await this.octokit.paginate(
      this.octokit.rest.pulls.listReviews,
      {
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        per_page: 100,
      },
    )) as any[];

    const unresolvedReviewIds = new Set(
      reviews
        .filter((review) => review.user?.login?.includes('coderabbit'))
        .filter((review) => review.state !== 'DISMISSED')
        .map((review) => review.id),
    );

    const comments = this.dedupeInlineComments(
      reviewComments.filter((c) => {
        const isCoderabbit = c.user?.login?.includes('coderabbit');
        const isUnresolved = c.pull_request_review_id
          ? unresolvedReviewIds.has(c.pull_request_review_id)
          : false;
        return isCoderabbit && isUnresolved;
      }) as Comment[],
    );

    this.logger.log(`Found ${comments.length} inline CodeRabbit comments`);
    return comments;
  }

  /**
   * Get all general CodeRabbit comments for a pull request.
   */
  async getGeneralComments(prNumber: number): Promise<any[]> {
    const { data } = await this.octokit.rest.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
    });

    const comments = this.dedupeGeneralComments(
      data.filter((c) => c.user?.login.includes('coderabbit')),
    );

    this.logger.log(`Found ${comments.length} general CodeRabbit comments`);
    return comments;
  }

  /**
   * Get all CodeRabbit comments, including inline and general comments.
   */
  async getAllComments(prNmber: number) {
    const inline = await this.getInlineComments(prNmber);
    const general = await this.getGeneralComments(prNmber);
    return { inline, general };
  }

  /**
   * Get unresolved review thread IDs keyed by the first review comment database ID.
   */
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

  /**
   * Reply to an inline review comment.
   */
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

  /**
   * Resolve a review thread by its GraphQL thread ID.
   */
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

  /**
   * Resolve comments associated with files that have been fixed.
   */
  async resolveComments(
    prNumber: number,
    comments: Comment[],
    fixedFiles: string[],
  ) {
    const threadMap = await this.getThreadIds(prNumber);

    for (const comment of comments) {
      if (fixedFiles.includes(comment.path)) {
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

  /**
   * Trigger a new CodeRabbit review on the pull request.
   */
  async triggerReview(prNumber: number) {
    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body: '@coderabbitai full review',
    });

    this.logger.log(`Triggered CodeRabbit review for PR #${prNumber}`);
  }

  /**
   * Wait for CodeRabbit to submit a new review and return its state.
   */
  async waitForReview(prNumber: number, timeoutMs = 600000): Promise<string> {
    this.logger.log('⏳ Waiting for CodeRabbit review...');

    const interval = 30000;
    const maxAttempts = timeoutMs / interval;
    let attempts = 0;
    let lastReviewId = 0;

    const { data: existing } = await this.octokit.rest.pulls.listReviews({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    const existingCoderabbit = existing.filter((r) =>
      r.user?.login.includes('coderabbit'),
    );

    if (existingCoderabbit.length > 0) {
      lastReviewId = existingCoderabbit[existingCoderabbit.length - 1].id;
    }

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

      this.logger.log(`⏳ Still waiting... attempt ${attempts}/${maxAttempts}`);
    }
    this.logger.warn('⏰ Timed out waiting for review');
    return 'timed_out';
  }

  /**
   * Merge the pull request.
   */
  async mergePR(prNumber: number) {
    // await this.octokit.rest.pulls.merge({
    //   owner: this.owner,
    //   repo: this.repo,
    //   pull_number: prNumber,
    //   merge_method: 'squash',
    // });
    this.logger.log(`✅ Merged PR #${prNumber}`);
  }

  /**
   * Post a general comment on the pull request.
   */
  async postComment(prNumber: number, body: string) {
    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body,
    });
  }

  /**
   * Get a branch by name.
   */
  async getBranch(branch: string) {
    return this.octokit.rest.repos.getBranch({
      owner: this.owner,
      repo: this.repo,
      branch,
    });
  }
}
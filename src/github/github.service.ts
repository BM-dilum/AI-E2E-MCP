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

  //open new PR
  async openPR(
    branch: string,
    title: string,
    body: string,
  ): Promise<PullRequest> {
    this.logger.log(`Openning PR: ${title}`);

    // get deafult branch
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

  //get PR details
  async getPR(prNumber: number): Promise<PullRequest> {
    const { data } = await this.octokit.rest.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    return data as PullRequest;
  }

  //get all unresolved coderabbit pr comments
  async getInlineComments(prNumber: number): Promise<Comment[]> {
    const { data } = await this.octokit.rest.pulls.listReviewComments({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    const comments = data.filter((c) => c.user?.login.includes('coderabbit'));

    this.logger.log(`Found ${comments.length} general CodeRabbit comments`);
    return comments;
  }

  //get all coderabbit comments (nitpicks)
  async getGeneralComments(prNumber: number): Promise<any[]> {
    const { data } = await this.octokit.rest.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
    });

    const comments = data.filter((c) => c.user?.login.includes('coderabbit'));

    this.logger.log(`Found ${comments.length} general CodeRabbit comments`);
    return comments;
  }

  //get all Coderabbit comments (inline + general)
  async getAllComments(prNmber: number) {
    const inline = await this.getInlineComments(prNmber);
    const general = await this.getGeneralComments(prNmber);
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
  async waitForReview(prNumber: number, timeoutMs = 600000): Promise<string> {
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
      lastReviewId = existingCoderabbit[existingCoderabbit.length - 1].id;
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

      this.logger.log(`⏳ Still waiting... attempt ${attempts}/${maxAttempts}`);
    }
    this.logger.warn('⏰ Timed out waiting for review');
    return 'timed_out';
  }

  // merge the PR
  async mergePR(prNumber: number) {
    await this.octokit.rest.pulls.merge({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      merge_method: 'squash',
    });
    this.logger.log(`✅ Merged PR #${prNumber}`);
  }

  async postComment(prNumber: number, body: string) {
    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body,
    });
  }
}

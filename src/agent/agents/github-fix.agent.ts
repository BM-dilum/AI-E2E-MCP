import { Injectable, Logger } from '@nestjs/common';
import { createAgent } from 'langchain';

import { ConfigService } from '@nestjs/config';
import { GithubTools } from '../tools/github.tools';
import { ChatGroq } from '@langchain/groq';
import { GitTools } from '../tools/git.tools';
import { ChatOpenAI } from '@langchain/openai';
import { AIService } from 'src/ai/ai.service';

@Injectable()
export class GithubFixAgent {
  private readonly logger = new Logger(GithubFixAgent.name);

  constructor(
    private githubTools: GithubTools,
    private configService: ConfigService,
  ) {}

  private getModal() {
    return new ChatOpenAI({
      apiKey: this.configService.getOrThrow('OPENAI_API_KEY'),
      model: 'gpt-5.4-mini',
      temperature: 0.1,
    });
  }

  private normalizeResult(output: string): string {
    const normalized = output.trim();

    if (/^done\b/i.test(normalized)) {
      return normalized;
    }

    if (/^needs_review\b/i.test(normalized)) {
      return normalized;
    }

    return `NEEDS_REVIEW prNumber=unknown raw=${JSON.stringify(normalized)}`;
  }

  async run(
    branch: string,
    prNumber: number,
    existingComments: { inline: any[]; general: any[] },
    repoPath?: string,
  ) {
    this.logger.log(`🔁 GithubFixAgent: branch=${branch}`);

    // build context from already-fetched comments
    const commentsContext = JSON.stringify(
      {
        total: existingComments.inline.length + existingComments.general.length,
        files: [...new Set(existingComments.inline.map((c) => c.path))],
        inline: existingComments.inline.map((c) => ({
          path: c.path,
          body: c.body,
        })),
        general: existingComments.general.map((c) => ({ body: c.body })),
      },
      null,
      2,
    );

    const agent = createAgent({
      model: this.getModal(),
      tools: [
        // this.githubTools.getComments(), // 6 tools — fix loop
        this.githubTools.fixFile(repoPath),
        this.githubTools.runTests(repoPath),
        this.githubTools.commitAndPush(repoPath),
        this.githubTools.resolveComments(),
        this.githubTools.triggerAndWaitForReview(),
        // this.githubTools.mergePR(),
      ],
      systemPrompt: `
      You are a GitHub fix agent for PR #${prNumber} on branch ${branch}.

      CodeRabbit comments are already provided below — do NOT fetch them.
      Use the EXACT file paths listed in the comments.

      COMMENTS:
      ${commentsContext}

      Steps — follow in order:
      1. fix_file for each file in the comments above
      2. run_tests — if failing, fix again max 3 times, never push if failing
      3. commit_and_push branch=${branch} message=fix: address CodeRabbit comments
      4. resolve_comments prNumber=${prNumber}
      5. trigger_and_wait_for_review prNumber=${prNumber}
      6. If APPROVED or timed_out → stop, return: DONE prNumber=${prNumber}
      7. If COMMENTED or CHANGES_REQUESTED → stop, return: NEEDS_REVIEW prNumber=${prNumber}

      RULES:
      - First tool call MUST be fix_file — not anything else
      - Use exact file paths from comments above
      - Always use prNumber=${prNumber}
      - Never call a tool that is not in your tools list
      `,
      middleware: [],
    });

    const result = await agent.invoke({
      messages: [
        {
          role: 'user',
          content: `Fix and merge PR #${prNumber} on branch ${branch}. Use prNumber=${prNumber} for ALL tool calls.`,
        },
      ],
    });

    const output = result.messages[result.messages.length - 1].content;
    const normalizedOutput = this.normalizeResult(
      typeof output === 'string' ? output : JSON.stringify(output),
    );

    if (/^done\b/i.test(normalizedOutput)) {
      this.logger.log(`✅ GithubFixAgent done: ${normalizedOutput}`);
    } else {
      this.logger.warn(`⚠️ GithubFixAgent needs review: ${normalizedOutput}`);
    }

    return normalizedOutput;
  }
}

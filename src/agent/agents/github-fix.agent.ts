import { Injectable, Logger } from '@nestjs/common';
import { createAgent } from 'langchain';

import { ConfigService } from '@nestjs/config';
import { GithubTools } from '../tools/github.tools';
import { ChatGroq } from '@langchain/groq';
import { GitTools } from '../tools/git.tools';

@Injectable()
export class GithubFixAgent {
  private readonly logger = new Logger(GithubFixAgent.name);

  constructor(
    private githubTools: GithubTools,
    private configService: ConfigService,
  ) {}

  private getModal() {
    return new ChatGroq({
      apiKey: this.configService.getOrThrow('GROQ_API_KEY'),
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
    });
  }

  async run(branch: string, repoPath?: string) {
    this.logger.log(`🔁 GithubFixAgent: branch=${branch}`);

    const agent = createAgent({
      model: this.getModal(),
      tools: [
        this.githubTools.getComments(), // 6 tools — fix loop
        this.githubTools.fixFile(repoPath),
        this.githubTools.runTests(repoPath),
        this.githubTools.commitAndPush(repoPath),
        this.githubTools.resolveComments(),
        this.githubTools.triggerReview(),
        this.githubTools.waitForReview(),
        // this.githubTools.mergePR(),
      ],
      systemPrompt: `
        Fix CodeRabbit comments and merge.
        1. get_comments
        2. fix_file for each file in comments
        3. run_tests — never push if failing
        4. commit_and_push
        5. resolve_comments
        6. trigger_review → wait_for_review
        7. If approved → merge_pr → stop
        8. Repeat max 5 times
      `,
      middleware: [],
    });

    const result = await agent.invoke({
      messages: [
        {
          role: 'user',
          content: `Fix and merge PR on branch: ${branch}`,
        },
      ],
    });

    const output = result.messages[result.messages.length - 1].content;
    this.logger.log(`✅ GithubFixAgent done`);
    return typeof output === 'string' ? output : JSON.stringify(output);
  }
}

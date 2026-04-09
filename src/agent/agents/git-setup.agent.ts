import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitTools } from '../tools/git.tools';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';

@Injectable()
export class GitSetupAgent {
  private readonly logger = new Logger(GitSetupAgent.name);

  constructor(
    private gitTools: GitTools,
    private configService: ConfigService,
  ) {}

  private getModal() {
    return new ChatOpenAI({
      apiKey: this.configService.getOrThrow('OPENAI_API_KEY'),
      model: 'gpt-5.4-mini',
      temperature: 0.1,
    });
  }

  async run(branch: string, repoPath?: string) {
    this.logger.log(`🔧 GitSetupAgent: branch=${branch}`);

    const agent = createAgent({
      model: this.getModal(),
      tools: [
        this.gitTools.checkoutMain(repoPath),
        this.gitTools.createBranch(repoPath),
        this.gitTools.pushBranch(repoPath),
      ],
      systemPrompt: `
          You are a git setup agent.
          Call these tools ONCE each, in this exact order:
          1. checkout_main — call it ONCE
          2. create_branch with name: ${branch} only the use the specified branch name  ${branch}   — call it ONCE
          3. push_branch branch=${branch} — ONCE
          You are done. Do not call any tool more than once. Stop immediately after create_branch.`,
      middleware: [],
    });

    const result = await agent.invoke({
      messages: [{ role: 'user', content: `Setup branch: ${branch}` }],
    });

    const output = result.messages[result.messages.length - 1].content;
    this.logger.log(`✅ GitSetupAgent done`);
    return typeof output === 'string' ? output : JSON.stringify(output);
  }
}

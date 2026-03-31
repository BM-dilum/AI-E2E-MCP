import { Injectable, Logger } from '@nestjs/common';
import { GitTools } from '../tools/git.tools';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { ChatGroq } from '@langchain/groq';
import { createAgent } from 'langchain';

@Injectable()
export class GitSetupAgent {
  private readonly logger = new Logger(GitSetupAgent.name);

  constructor(
    private gitTools: GitTools,
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
    this.logger.log(`🔧 GitSetupAgent: branch=${branch}`);

    const agent = createAgent({
      model: this.getModal(),
      tools: [
        this.gitTools.checkoutMain(repoPath),
        this.gitTools.createBranch(repoPath),
      ],
      systemPrompt: 'Checkout main, create branch.',
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

import { Injectable, Logger } from '@nestjs/common';
import { GitTools } from '../tools/git.tools';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { ChatGroq } from '@langchain/groq';
import { createAgent } from 'langchain';
import { AIService } from 'src/ai/ai.service';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class GitSetupAgent {
  private readonly logger = new Logger(GitSetupAgent.name);
  private llm: ChatGroq | ChatOpenAI;

  constructor(
    private gitTools: GitTools,
    private configService: ConfigService,
    private aiService: AIService,
  ) {
    this.llm = this.aiService.getLLM();
  }

  async run(branch: string, repoPath?: string) {
    this.logger.log(`🔧 GitSetupAgent: branch=${branch}`);

    const agent = createAgent({
      model: this.llm,
      tools: [
        this.gitTools.checkoutMain(repoPath),
        this.gitTools.createBranch(repoPath),
        this.gitTools.pushBranch(repoPath),
      ],
      systemPrompt: `
          You are a git setup agent.
          Call these tools ONCE each, in this exact order:
          1. checkout_main — call it ONCE
          2. create_branch with name: ${branch} — call it ONCE
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

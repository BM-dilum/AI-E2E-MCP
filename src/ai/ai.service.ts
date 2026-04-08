import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GeneratedFileSummary } from 'src/agent/agent.service';

export interface GeneratedFiles {
  path: string;
  content: string;
}

export interface SprintPlan {
  branch: string;
  prTitle: string;
  commitMessage: string;
  filePaths: string[];
  files: GeneratedFiles[];
}

export enum Providers {
  openai = 'openai',
  groq = 'groq',
}

@Injectable()
export class AIService {
  private groq: Groq;
  private openAI: OpenAI;
  private provider: Providers;
  private llm: ChatGroq | ChatOpenAI; // used for langchain
  private readonly logger = new Logger(AIService.name);

  constructor(private configService: ConfigService) {
    const providerKey = this.configService.getOrThrow<string>('AI_PROVIDER');
    this.provider = Providers[providerKey];
    if (!this.provider) {
      throw new Error(`Unsupported AI_PROVIDER: ${providerKey}`);
    }

    this.logger.log(`🤖 AI Provider: ${this.provider}`);

    if (this.provider === Providers.openai) {
      this.openAI = new OpenAI({
        apiKey: this.configService.getOrThrow('OPENAI_API_KEY'),
      });
    } else {
      this.groq = new Groq({
        apiKey: this.configService.getOrThrow('GROQ_API_KEY'),
      });
    }
    this.llm = this.initLLM();
  }

  private initLLM(): ChatGroq | ChatOpenAI {
    if (this.provider === Providers.groq) {
      return new ChatGroq({
        apiKey: this.configService.getOrThrow('GROQ_API_KEY'),
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
      });
    }
    if (this.provider === Providers.openai) {
      return new ChatOpenAI({
        apiKey: this.configService.getOrThrow('OPENAI_API_KEY'),
        model: 'gpt-5-mini',
        temperature: 0.1,
      });
    }
    throw new Error(`Unsupported AI_PROVIDER: ${this.provider}`);
  }

  getLLM(): ChatGroq | ChatOpenAI {
    return this.llm;
  }

  private async complete(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    options: {
      max_completion_tokens?: number;
      temperature?: number;
    } = {},
  ): Promise<string> {
    const { max_completion_tokens = 1024, temperature = 0.1 } = options;
    if (this.provider === Providers.groq) {
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        max_completion_tokens,
        temperature,
        messages: messages,
      });

      return response.choices[0].message.content ?? '';
    } else {
      const response = await this.openAI.chat.completions.create({
        model: 'gpt-5-mini',
        max_completion_tokens,
        temperature,
        messages: messages,
      });

      return response.choices[0].message.content ?? '';
    }
  }

  async planFromSpec(spec: string): Promise<SprintPlan> {
    this.logger.log('Planning from spec...');

    let messages = [
      {
        role: 'system' as const,
        content: `You are a project planner.
                Read the spec and extract key metadata.
                Return ONLY valid JSON — no markdown, no backticks.

                Return this exact structure:
                {
                "branch": "feat/kebab-case-name",
                "prTitle": "Human Readable PR Title",
                "commitMessage": "feat: short commit message",
                "filePaths": ["contracts/Name.sol", "test/Name.test.ts", "hardhat.config.ts", "package.json"]
                }`,
      },
      {
        role: 'user' as const,
        content: spec,
      },
    ];

    const text = await this.complete(messages);
    const cleaned = text
      .replace(/^```[\w]*\n/, '')
      .replace(/\n```$/, '')
      .trim();

    const plan = JSON.parse(cleaned);
    this.logger.log(`Branch: ${plan.branch}`);
    this.logger.log(`Files: ${plan.filePaths.join(', ')}`);

    return {
      branch: plan.branch,
      prTitle: plan.prTitle,
      commitMessage: plan.commitMessage,
      filePaths: plan.filePaths,
      files: [],
    };
  }

  //step 2. generate code for each file
  async generateFile(
    spec: string,
    filePath: string,
    plan: SprintPlan,
    previousFiles: GeneratedFileSummary[],
  ): Promise<string> {
    this.logger.log(`Generating ${filePath}`);

    const context = previousFiles
      .map((f) => `FILE: ${f.path}\n${f.exports}`)
      .join('\n\n---\n\n');

    const allFiles = plan.filePaths.join('\n') ?? '';

    let messages = [
      {
        role: 'system' as const,
        content: `You are an expert software engineer.
                    Generate complete production ready code for the requested file.
                    CRITICAL RULES:
                    - Return ONLY the raw file content
                    - No markdown code blocks
                    - No backticks
                    - No explanations
                    - Start with the first line of code
                    - End with the last line of code
                    - Follow the exact stack specified in the spec
                    - Follow the exact conventions specified in the spec
                    - Never add placeholder comments or TODOs
                    - Full working implementation only
                    `,
      },
      {
        role: 'user' as const,
        content: `SPEC: 
                    ${spec}

                    PROJECT PLAN:
                        - Branch: ${plan.branch}
                        - PR Title: ${plan.prTitle}
                        - all files in this project: ${allFiles}

                        ${context ? `ALREADY GENERATED FILES FOR CONTEXT:\n${context}` : ''}

                    NOW GENERATE THIS FILE: ${filePath}

                    return only the completed file content for ${filePath}
          
          `,
      },
    ];

    const content = await this.complete(messages, {
      max_completion_tokens: 4096,
    });
    return content
      .replace(/^```[\w]*\n/, '')
      .replace(/\n```$/, '')
      .trim();
  }

  // step 3: fix a file based on CodeRabbit comments
  async fixFile(
    filePath: string,
    fileContent: string,
    issues: string,
  ): Promise<string | null> {
    this.logger.log(`Fixing ${filePath}`);

    let messages = [
      {
        role: 'system' as const,
        content: `You are an expert software engineer.
                    Fix the provided issues of the provided file 
                    CRITICAL RULES:
                    - Return ONLY the raw file content
                    - No markdown code blocks
                    - No backticks
                    - No explanations
                    - Start with the first line of code
                    - End with the last line of code                   
                    `,
      },
      {
        role: 'user' as const,
        content: ` FILE PATH: ${filePath}

          CURRENT FILE CONTENT: 
          ${fileContent}
          
          ISSUES TO FIX:
          ${issues}
          `,
      },
    ];

    const content = await this.complete(messages, {
      max_completion_tokens: 4096,
    });
    if (!content) return null;

    return content
      .replace(/^```[\w]*\n/, '')
      .replace(/\n```$/, '')
      .trim();
  }
}

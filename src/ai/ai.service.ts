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

@Injectable()
export class AIService {
  private openAI: OpenAI;
  private readonly logger = new Logger(AIService.name);

  constructor(private configService: ConfigService) {
    this.openAI = new OpenAI({
      apiKey: this.configService.getOrThrow('OPENAI_API_KEY'),
    });
  }

  async planFromSpec(spec: string): Promise<SprintPlan> {
    this.logger.log('Planning from spec...');

    const response = await this.openAI.chat.completions.create({
      model: 'gpt-5.4-mini',
      max_completion_tokens: 1024,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are a project planner.
                Read the spec and extract key metadata.
                Return ONLY valid JSON — no markdown, no backticks.

                Return this exact structure:
                {
                "branch": "feat/kebab-case-name", only take the branch name from the provided spec. DO NOT hallucinate a branch name if it's not provided in the spec.
                "prTitle": "Human Readable PR Title",
                "commitMessage": "feat: short commit message",
                "filePaths": ["contracts/Name.sol", "test/Name.test.ts", "hardhat.config.ts", "package.json"]
                }`,
        },
        {
          role: 'user',
          content: spec,
        },
      ],
    });

    const text = response.choices[0].message.content ?? '';
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

    const response = await this.openAI.chat.completions.create({
      model: 'gpt-5.4-mini',
      max_completion_tokens: 4096,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
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
          role: 'user',
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
      ],
    });

    const content = response.choices[0].message.content ?? '';
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

    const response = await this.openAI.chat.completions.create({
      model: 'gpt-5.4-mini',
      max_completion_tokens: 4096,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
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
          role: 'user',
          content: ` FILE PATH: ${filePath}

          CURRENT FILE CONTENT: 
          ${fileContent}
          
          ISSUES TO FIX:
          ${issues}
          `,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) return null;

    return content
      .replace(/^```[\w]*\n/, '')
      .replace(/\n```$/, '')
      .trim();
  }
}
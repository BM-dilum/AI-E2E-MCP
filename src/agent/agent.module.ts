import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { GitService } from 'src/github/git.service';
import { GithubService } from 'src/github/github.service';
import { AIService } from 'src/ai/ai.service';
import { GithubModule } from 'src/github/github.module';
import { AIModule } from 'src/ai/ai.module';
import { GitSetupAgent } from './agents/git-setup.agent';
import { GithubFixAgent } from './agents/github-fix.agent';
import { GithubReviewAgent } from './agents/github-review.agent';
import { GithubTools } from './tools/github.tools';
import { GitFixAgent } from './agents/git-fix-agent';
import { GitTools } from './tools/git.tools';

@Module({
  imports: [GithubModule, AIModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    GithubFixAgent,
    GithubReviewAgent,
    GitSetupAgent,
    GitFixAgent,
    GithubTools,
    GitTools,
  ],
  exports: [AgentService],
})
export class AgentModule {}

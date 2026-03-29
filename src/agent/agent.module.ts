import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { GitService } from 'src/github/git.service';
import { GithubService } from 'src/github/github.service';
import { GroqService } from 'src/groq/groq.service';
import { GithubModule } from 'src/github/github.module';
import { GroqModule } from 'src/groq/groq.module';

@Module({
  imports: [GithubModule, GroqModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}

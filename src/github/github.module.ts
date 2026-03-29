import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { ConfigModule } from '@nestjs/config';
import { GitService } from './git.service';

@Module({
  controllers: [GithubController],
  providers: [GithubService, GitService],
  exports: [GithubService, GitService],
})
export class GithubModule {}

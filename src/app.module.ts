import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GithubModule } from './github/github.module';
import { AIModule } from './ai/ai.module';
import { AgentModule } from './agent/agent.module';
import { McpModule } from './mcp/mcp.module';
import { WebhookModule } from './webhook/webhook.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    GithubModule,
    AIModule,
    AgentModule,
    McpModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

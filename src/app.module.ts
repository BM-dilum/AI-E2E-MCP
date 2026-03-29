import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GithubModule } from './github/github.module';
import { GroqModule } from './groq/groq.module';
import { AgentModule } from './agent/agent.module';
import { McpModule } from './mcp/mcp.module';
import { WebhookModule } from './webhook/webhook.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    GithubModule,
    GroqModule,
    AgentModule,
    McpModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

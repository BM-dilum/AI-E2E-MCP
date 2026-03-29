import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AgentService } from 'src/agent/agent.service';
import { GroqService } from 'src/groq/groq.service';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(private agentService: AgentService) {}

  async callTool(name: string, arsg: any) {
    this.logger.log(`Running tool: ${name}`);

    switch (name) {
      case 'ship_feature':
        return this.agentService.shipFeature(arsg.spec);
      case 'fix_and_merge':
        return this.agentService.fixAndMerge(arsg.prNumber, arsg.branch);
      default:
        throw new BadRequestException(`Unknown tool: ${name}`);
    }
  }
}

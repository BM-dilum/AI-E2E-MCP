import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private readonly mcpService: McpService) {}

  //Get VS Code calls this first to discover tools
  @Get('tools')
  getTools() {
    this.logger.log('📥 VS Code requesting tool list');
    return {
      tools: [
        {
          name: 'ship_feature',
          description:
            'Takes a spec and ships it end to end — generates code, creates branch, opens PR, fixes CodeRabbit comments and merges',
          inputSchema: {
            type: 'object',
            properties: {
              spec: {
                type: 'string',
                description: 'The full feature spec to implement',
              },
              repoPath: {
                type: 'string',
                description:
                  'Workspace path where generated target repos are created or reused',
              },
            },
            required: ['spec'],
          },
        },
        {
          name: 'fix_and_merge',
          description:
            'Reads CodeRabbit comments on a PR, fixes the code locally, pushes and merges',
          inputSchema: {
            type: 'object',
            properties: {
              prNumber: {
                type: 'number',
                description: 'PR number to fix and merge',
              },
              branch: {
                type: 'string',
                description: 'Branch name of the PR',
              },
              repoPath: {
                type: 'string',
                description: 'Absolute path to local repo',
              },
            },
            required: ['prNumber', 'branch'],
          },
        },
      ],
    };
  }

  //vs code calls this when user invlokes a tool
  @Post('call')
  async callToo(@Body() body: { name: string; arguments: any }) {
    this.logger.log(`Tool called: ${body.name}`);
    this.logger.log(`Arguments: ${JSON.stringify(body.arguments)}`);

    return this.mcpService.callTool(body.name, body.arguments);
  }
}

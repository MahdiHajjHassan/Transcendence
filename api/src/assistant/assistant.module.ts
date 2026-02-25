import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { OrchestratorService } from './orchestrator.service';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { WorkflowAgentService } from './workflow-agent.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { TicketsModule } from '../tickets/tickets.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [KnowledgeModule, TicketsModule, AiModule],
  providers: [
    AssistantService,
    OrchestratorService,
    KnowledgeAgentService,
    WorkflowAgentService,
  ],
  controllers: [AssistantController],
})
export class AssistantModule {}

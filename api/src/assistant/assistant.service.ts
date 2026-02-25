import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AgentIntent, Department } from '../common/enums';
import { AssistantMessageDto } from './dto/assistant-message.dto';
import { AssistantResponse } from './types';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { WorkflowAgentService } from './workflow-agent.service';
import { OrchestratorService } from './orchestrator.service';

@Injectable()
export class AssistantService {
  private readonly confidenceThreshold = 0.35;

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledgeAgent: KnowledgeAgentService,
    private readonly workflowAgent: WorkflowAgentService,
    private readonly orchestrator: OrchestratorService,
  ) {}

  async message(
    user: {
      userId: string;
      schoolId: string;
      role: Role;
      department: Department | null;
    },
    dto: AssistantMessageDto,
  ): Promise<AssistantResponse> {
    const intent = this.orchestrator.classifyIntent(dto.message);
    const routedAgents: string[] = [];

    let message = '';
    let confidence: number | undefined;
    let citations: Array<{ sourceId: string; title: string }> = [];
    let ticketId: string | undefined;

    if (intent === AgentIntent.KNOWLEDGE || intent === AgentIntent.MIXED) {
      routedAgents.push('KnowledgeAgent');
      const department =
        dto.department ??
        user.department ??
        this.orchestrator.detectDepartment(dto.message) ??
        null;
      const knowledgeResult = await this.knowledgeAgent.answer(
        dto.message,
        department,
      );
      confidence = knowledgeResult.confidence;
      citations = knowledgeResult.citations;

      if (
        knowledgeResult.missingContext ||
        knowledgeResult.confidence < this.confidenceThreshold
      ) {
        if (dto.createTicketOnDecline) {
          routedAgents.push('WorkflowAgent');
          const workflowResult = await this.workflowAgent.handle(user, {
            ...dto,
            department: dto.department ?? department ?? Department.IT,
            subject: dto.subject ?? 'Escalation from assistant',
            description: dto.description ?? dto.message,
          });

          message = `I could not answer from trusted sources, so I escalated this to staff. ${workflowResult.message}`;
          ticketId = workflowResult.ticketId;
        } else {
          message =
            'I could not find enough trusted context to answer safely. Do you want me to create a support ticket?';
        }
      } else {
        message = knowledgeResult.message;
      }
    }

    if (intent === AgentIntent.WORKFLOW) {
      routedAgents.push('WorkflowAgent');
      const workflowResult = await this.workflowAgent.handle(user, dto);
      message = workflowResult.message;
      ticketId = workflowResult.ticketId;
    }

    if (
      intent === AgentIntent.MIXED &&
      !ticketId &&
      dto.message.toLowerCase().includes('ticket')
    ) {
      routedAgents.push('WorkflowAgent');
      const workflowResult = await this.workflowAgent.handle(user, dto);
      message = `${message}\n\n${workflowResult.message}`;
      ticketId = workflowResult.ticketId;
    }

    const trace = await this.prisma.orchestratorTrace.create({
      data: {
        userId: user.userId,
        intent,
        confidence,
        routedAgents,
        outcome: {
          message,
          ticketId,
        },
      },
    });

    return {
      traceId: trace.id,
      intent,
      message,
      confidence,
      citations,
      ticketSuggestion: message.includes(
        'Do you want me to create a support ticket',
      )
        ? {
            allowed: true,
            reason: 'No trusted context found.',
          }
        : undefined,
      ...(ticketId ? { ticketId } : {}),
    };
  }
}

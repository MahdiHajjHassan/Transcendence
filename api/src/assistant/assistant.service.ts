import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcademicDepartment,
  AgentIntent,
  SupportArea,
} from '../common/enums';
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
      supportArea: SupportArea | null;
      academicDepartment: AcademicDepartment | null;
    },
    dto: AssistantMessageDto,
  ): Promise<AssistantResponse> {
    const intent = this.orchestrator.classifyIntent(dto.message);
    const canCreateTicket = user.role === Role.STUDENT;
    const routedAgents: string[] = [];

    let message = '';
    let confidence: number | undefined;
    let citations: Array<{ sourceId: string; title: string }> = [];
    let ticketId: string | undefined;

    if (intent === AgentIntent.KNOWLEDGE || intent === AgentIntent.MIXED) {
      routedAgents.push('KnowledgeAgent');
      const supportArea =
        dto.supportArea ??
        user.supportArea ??
        this.orchestrator.detectSupportArea(dto.message) ??
        null;
      const knowledgeResult = await this.knowledgeAgent.answer(
        dto.message,
        supportArea,
      );
      confidence = knowledgeResult.confidence;
      citations = knowledgeResult.citations;

      if (
        knowledgeResult.missingContext ||
        knowledgeResult.confidence < this.confidenceThreshold
      ) {
        if (dto.createTicketOnDecline && canCreateTicket) {
          routedAgents.push('WorkflowAgent');
          const workflowResult = await this.workflowAgent.handle(user, {
            ...dto,
            supportArea:
              dto.supportArea ?? supportArea ?? SupportArea.IT,
            subject: dto.subject ?? 'Escalation from assistant',
            description: dto.description ?? dto.message,
          });

          message = `I could not answer from trusted sources, so I escalated this to staff. ${workflowResult.message}`;
          ticketId = workflowResult.ticketId;
        } else {
          message = canCreateTicket
            ? 'I could not find enough trusted context to answer safely. Do you want me to create a support ticket?'
            : 'I could not find enough trusted context to answer safely. Staff and admins can still use the assistant, check ticket status, and manage the ticket queue, but only students can submit new tickets.';
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
      ticketSuggestion:
        canCreateTicket &&
        message.includes('Do you want me to create a support ticket')
        ? {
            allowed: true,
            reason: 'No trusted context found.',
          }
        : undefined,
      ...(ticketId ? { ticketId } : {}),
    };
  }
}

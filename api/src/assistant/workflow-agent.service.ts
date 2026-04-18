import { Injectable } from '@nestjs/common';
import { AcademicDepartment, Role, SupportArea } from '@prisma/client';
import { AssistantMessageDto } from './dto/assistant-message.dto';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class WorkflowAgentService {
  constructor(private readonly ticketsService: TicketsService) {}

  async handle(
    user: {
      userId: string;
      role: Role;
      supportArea: SupportArea | null;
      academicDepartment: AcademicDepartment | null;
    },
    dto: AssistantMessageDto,
  ): Promise<{ message: string; ticketId?: string }> {
    const text = dto.message.toLowerCase();

    const ticketIdMatch = dto.message.match(/ticket\s+([a-z0-9]{10,})/i);
    if (text.includes('status') && ticketIdMatch) {
      const ticket = await this.ticketsService.getAccessibleTicketById(
        ticketIdMatch[1],
        user.userId,
        user.role,
        user.supportArea,
        user.academicDepartment,
      );
      return {
        message: `Ticket ${ticket.id} is currently ${ticket.status}.`,
        ticketId: ticket.id,
      };
    }

    const createSignals = [
      'create ticket',
      'open ticket',
      'create request',
      'open request',
      'support request',
      'escalate',
    ];

    const shouldCreate =
      createSignals.some((signal) => text.includes(signal)) ||
      Boolean(dto.supportArea && dto.subject && dto.description);

    if (shouldCreate) {
      if (user.role !== Role.STUDENT) {
        return {
          message:
            'Only students can create support tickets. Staff and admins can still use the assistant and manage tickets from the queue.',
        };
      }

      const supportArea =
        dto.supportArea ?? user.supportArea ?? SupportArea.IT;
      const subject = dto.subject ?? this.inferSubject(dto.message);
      const description = dto.description ?? dto.message;

      const ticket = await this.ticketsService.createTicket(user.userId, {
        supportArea,
        subject,
        description,
      });

      return {
        message: `I created ticket ${ticket.id} for ${supportArea}. The support team has been notified.`,
        ticketId: ticket.id,
      };
    }

    return {
      message:
        user.role === Role.STUDENT
          ? 'I can create a support ticket or check ticket status. Say "create ticket" and include details.'
          : 'I can help answer questions or check ticket status. Ticket creation is restricted to students.',
    };
  }

  private inferSubject(message: string): string {
    const trimmed = message.trim();
    if (trimmed.length <= 60) {
      return trimmed;
    }

    return `${trimmed.slice(0, 57)}...`;
  }
}

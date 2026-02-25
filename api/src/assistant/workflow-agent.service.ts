import { Injectable } from '@nestjs/common';
import { Department, Role } from '@prisma/client';
import { AssistantMessageDto } from './dto/assistant-message.dto';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class WorkflowAgentService {
  constructor(private readonly ticketsService: TicketsService) {}

  async handle(
    user: { userId: string; role: Role; department: Department | null },
    dto: AssistantMessageDto,
  ): Promise<{ message: string; ticketId?: string }> {
    const text = dto.message.toLowerCase();

    const ticketIdMatch = dto.message.match(/ticket\s+([a-z0-9]{10,})/i);
    if (text.includes('status') && ticketIdMatch) {
      const ticket = await this.ticketsService.getTicketById(ticketIdMatch[1]);
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
      Boolean(dto.department && dto.subject && dto.description);

    if (shouldCreate) {
      const department = dto.department ?? user.department ?? Department.IT;
      const subject = dto.subject ?? this.inferSubject(dto.message);
      const description = dto.description ?? dto.message;

      const ticket = await this.ticketsService.createTicket(user.userId, {
        department,
        subject,
        description,
      });

      return {
        message: `I created ticket ${ticket.id} for ${department}. The support team has been notified.`,
        ticketId: ticket.id,
      };
    }

    return {
      message:
        'I can create a support ticket or check ticket status. Say "create ticket" and include details.',
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

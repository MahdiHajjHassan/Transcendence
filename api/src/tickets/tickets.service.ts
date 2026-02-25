import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Department,
  NotificationType,
  Prisma,
  Role,
  TicketStatus,
} from '@prisma/client';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createTicket(studentId: string, dto: CreateTicketDto) {
    const ticket = await this.prisma.ticket.create({
      data: {
        studentId,
        department: dto.department,
        subject: dto.subject,
        description: dto.description,
        events: {
          create: {
            actorId: studentId,
            eventType: 'CREATED',
            payload: {
              subject: dto.subject,
              department: dto.department,
            },
          },
        },
      },
      include: {
        student: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    const staff = await this.prisma.user.findMany({
      where: {
        role: Role.STAFF,
        department: dto.department,
        active: true,
      },
      select: {
        id: true,
        email: true,
      },
    });

    await this.notificationsService.createMany(
      staff.map((member) => member.id),
      NotificationType.TICKET_CREATED,
      `New ${dto.department} ticket`,
      `Ticket ${ticket.id} was created by student ${ticket.student.schoolId}.`,
    );

    await Promise.all(
      staff
        .filter((member) => Boolean(member.email))
        .map((member) =>
          this.mailService.sendMail(
            member.email!,
            `New ${dto.department} support ticket`,
            `Ticket ${ticket.id}: ${dto.subject}`,
          ),
        ),
    );

    return ticket;
  }

  async getTicketById(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        attachments: true,
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }

    return ticket;
  }

  async listMyTickets(studentId: string, query: ListTicketsQueryDto) {
    return this.listTickets({
      query,
      where: {
        studentId,
      },
    });
  }

  async listQueue(query: ListTicketsQueryDto, department?: Department | null) {
    return this.listTickets({
      query,
      where: {
        ...(department ? { department } : {}),
      },
    });
  }

  async claim(ticketId: string, staffId: string) {
    const ticket = await this.getTicketById(ticketId);

    if (ticket.status === TicketStatus.RESOLVED) {
      throw new BadRequestException('Cannot claim a resolved ticket.');
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assigneeId: staffId,
        status: TicketStatus.IN_PROGRESS,
        events: {
          create: {
            actorId: staffId,
            eventType: 'CLAIMED',
          },
        },
      },
    });

    await this.notificationsService.createMany(
      [updated.studentId],
      NotificationType.TICKET_UPDATED,
      'Ticket claimed',
      `Your ticket ${updated.id} is now in progress.`,
    );

    return updated;
  }

  async updateStatus(
    ticketId: string,
    actorId: string,
    dto: UpdateTicketStatusDto,
  ) {
    const ticket = await this.getTicketById(ticketId);

    const updated = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: dto.status,
        events: {
          create: {
            actorId,
            eventType: 'STATUS_CHANGED',
            payload: {
              status: dto.status,
            },
          },
        },
      },
    });

    await this.notificationsService.createMany(
      [updated.studentId],
      NotificationType.TICKET_UPDATED,
      'Ticket status updated',
      `Ticket ${updated.id} moved to ${dto.status}.`,
    );

    return updated;
  }

  async updateTicket(
    ticketId: string,
    actorId: string,
    actorRole: Role,
    dto: UpdateTicketDto,
  ) {
    const ticket = await this.getTicketById(ticketId);

    if (actorRole === Role.STUDENT && ticket.studentId !== actorId) {
      throw new ForbiddenException('Students can only edit their own tickets.');
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        ...(dto.department ? { department: dto.department } : {}),
        ...(dto.subject ? { subject: dto.subject } : {}),
        ...(dto.description ? { description: dto.description } : {}),
        events: {
          create: {
            actorId,
            eventType: 'UPDATED',
            payload: dto as Prisma.InputJsonValue,
          },
        },
      },
    });

    return updated;
  }

  async addAttachment(
    ticketId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    const ticket = await this.getTicketById(ticketId);

    this.validateAttachment(file);

    const uploadsDir =
      this.configService.get<string>('UPLOAD_DIR') ?? 'uploads';
    await fs.mkdir(uploadsDir, { recursive: true });

    const extension = extname(file.originalname);
    const safeName = `${randomUUID()}${extension}`;
    const storagePath = join(uploadsDir, safeName);
    await fs.writeFile(storagePath, file.buffer);

    const attachment = await this.prisma.attachment.create({
      data: {
        ticketId: ticket.id,
        uploaderId: userId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath,
      },
    });

    await this.prisma.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        actorId: userId,
        eventType: 'ATTACHMENT_ADDED',
        payload: {
          attachmentId: attachment.id,
        },
      },
    });

    return attachment;
  }

  async removeAttachment(
    ticketId: string,
    attachmentId: string,
    actorId: string,
    actorRole: Role,
  ) {
    const ticket = await this.getTicketById(ticketId);

    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment || attachment.ticketId !== ticket.id) {
      throw new NotFoundException('Attachment not found for this ticket.');
    }

    if (
      actorRole === Role.STUDENT &&
      attachment.uploaderId !== actorId &&
      ticket.studentId !== actorId
    ) {
      throw new ForbiddenException('Not allowed to delete this attachment.');
    }

    await this.prisma.attachment.delete({
      where: { id: attachmentId },
    });

    await fs.rm(attachment.storagePath, { force: true });

    await this.prisma.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        actorId,
        eventType: 'ATTACHMENT_REMOVED',
        payload: {
          attachmentId,
        },
      },
    });

    return { success: true };
  }

  private validateAttachment(file: Express.Multer.File): void {
    const allowedTypes = new Set([
      'image/png',
      'image/jpeg',
      'application/pdf',
      'text/plain',
    ]);

    if (!allowedTypes.has(file.mimetype)) {
      throw new BadRequestException('Unsupported file type.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Attachment too large (max 5MB).');
    }
  }

  private async listTickets(params: {
    query: ListTicketsQueryDto;
    where: Prisma.TicketWhereInput;
  }) {
    const { query } = params;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.TicketWhereInput = {
      ...params.where,
      ...(query.department ? { department: query.department } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { subject: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          attachments: true,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      items,
    };
  }
}

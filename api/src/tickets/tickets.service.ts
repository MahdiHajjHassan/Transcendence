import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AcademicDepartment,
  NotificationType,
  Prisma,
  Role,
  SupportArea,
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
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';

const ticketDetailInclude = Prisma.validator<Prisma.TicketInclude>()({
  student: {
    select: {
      id: true,
      schoolId: true,
      supportArea: true,
      academicDepartment: true,
      profile: {
        select: {
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  },
  assignee: {
    select: {
      id: true,
      schoolId: true,
      supportArea: true,
      academicDepartment: true,
      profile: {
        select: {
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  },
  attachments: {
    orderBy: { createdAt: 'asc' },
    include: {
      uploader: {
        select: {
          id: true,
          schoolId: true,
          profile: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
  },
  events: {
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: {
      actor: {
        select: {
          id: true,
          schoolId: true,
          role: true,
          supportArea: true,
          academicDepartment: true,
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  },
});

type TicketDetail = Prisma.TicketGetPayload<{
  include: typeof ticketDetailInclude;
}>;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createTicket(studentId: string, dto: CreateTicketDto) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        schoolId: true,
        role: true,
        active: true,
        academicDepartment: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    if (student.role !== Role.STUDENT || !student.active) {
      throw new ForbiddenException(
        'Only active students can submit tickets.',
      );
    }

    if (!student.academicDepartment) {
      throw new ForbiddenException(
        'Your academic department is not assigned yet. Contact an admin before submitting a ticket.',
      );
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        studentId: student.id,
        supportArea: dto.supportArea,
        academicDepartment: student.academicDepartment,
        subject: dto.subject,
        description: dto.description,
        events: {
          create: {
            actorId: student.id,
            eventType: 'CREATED',
            payload: {
              subject: dto.subject,
              supportArea: dto.supportArea,
              academicDepartment: student.academicDepartment,
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
        supportArea: dto.supportArea,
        academicDepartment: student.academicDepartment,
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
      `New ${dto.supportArea} ticket for ${student.academicDepartment}`,
      `Ticket ${ticket.id} was created by student ${ticket.student.schoolId}.`,
    );

    await Promise.all(
      staff
        .filter((member) => Boolean(member.email))
        .map((member) =>
          this.mailService.sendMail(
            member.email!,
            `New ${dto.supportArea} ticket for ${student.academicDepartment}`,
            `Ticket ${ticket.id}: ${dto.subject}`,
          ),
        ),
    );

    return ticket;
  }

  async getTicketById(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: ticketDetailInclude,
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }

    return ticket;
  }

  async getAccessibleTicketById(
    ticketId: string,
    actorId: string,
    actorRole: Role,
    actorSupportArea?: SupportArea | null,
    actorAcademicDepartment?: AcademicDepartment | null,
  ) {
    const ticket = await this.getTicketById(ticketId);
    this.assertTicketViewAccess(
      ticket,
      actorId,
      actorRole,
      actorSupportArea,
      actorAcademicDepartment,
    );
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

  async listQueue(
    query: ListTicketsQueryDto,
    actorId: string,
    actorRole: Role,
    actorSupportArea?: SupportArea | null,
    actorAcademicDepartment?: AcademicDepartment | null,
  ) {
    if (actorRole === Role.STAFF) {
      this.assertStaffRoutingAssignment(
        actorSupportArea,
        actorAcademicDepartment,
      );
    }

    const scopedQuery =
      actorRole === Role.ADMIN
        ? query
        : {
            ...query,
            supportArea: undefined,
            academicDepartment: undefined,
          };

    return this.listTickets({
      query: scopedQuery,
      where: {
        ...(actorRole === Role.ADMIN
          ? {
              ...(query.supportArea ? { supportArea: query.supportArea } : {}),
              ...(query.academicDepartment
                ? { academicDepartment: query.academicDepartment }
                : {}),
            }
          : {
              supportArea: actorSupportArea!,
              academicDepartment: actorAcademicDepartment!,
              OR: [{ assigneeId: null }, { assigneeId: actorId }],
            }),
      },
    });
  }

  async claim(
    ticketId: string,
    staffId: string,
    actorRole: Role,
    actorSupportArea?: SupportArea | null,
    actorAcademicDepartment?: AcademicDepartment | null,
  ) {
    const ticket = await this.getTicketById(ticketId);
    this.assertTicketViewAccess(
      ticket,
      staffId,
      actorRole,
      actorSupportArea,
      actorAcademicDepartment,
    );

    if (ticket.status === TicketStatus.RESOLVED) {
      throw new BadRequestException('Cannot claim a resolved ticket.');
    }

    if (ticket.assigneeId && ticket.assigneeId !== staffId) {
      throw new BadRequestException('This ticket has already been claimed.');
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
    actorRole: Role,
    actorSupportArea: SupportArea | null,
    actorAcademicDepartment: AcademicDepartment | null,
    dto: UpdateTicketStatusDto,
  ) {
    const ticket = await this.getTicketById(ticketId);
    this.assertTicketViewAccess(
      ticket,
      actorId,
      actorRole,
      actorSupportArea,
      actorAcademicDepartment,
    );

    if (actorRole === Role.STAFF && ticket.assigneeId !== actorId) {
      throw new ForbiddenException(
        'Only the assigned staff member can change ticket status.',
      );
    }

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
    actorSupportArea: SupportArea | null,
    actorAcademicDepartment: AcademicDepartment | null,
    dto: UpdateTicketDto,
  ) {
    const ticket = await this.getTicketById(ticketId);
    this.assertTicketViewAccess(
      ticket,
      actorId,
      actorRole,
      actorSupportArea,
      actorAcademicDepartment,
    );

    if (actorRole === Role.STUDENT && ticket.studentId !== actorId) {
      throw new ForbiddenException('Students can only edit their own tickets.');
    }

    if (actorRole === Role.STAFF && ticket.assigneeId !== actorId) {
      throw new ForbiddenException(
        'Only the assigned staff member can update this ticket.',
      );
    }

    const supportAreaChanged =
      Boolean(dto.supportArea) && dto.supportArea !== ticket.supportArea;

    if (supportAreaChanged && actorRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only admins can reroute a ticket to a different support area.',
      );
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        ...(dto.supportArea ? { supportArea: dto.supportArea } : {}),
        ...(dto.subject ? { subject: dto.subject } : {}),
        ...(dto.description ? { description: dto.description } : {}),
        ...(supportAreaChanged
          ? {
              assigneeId: null,
              status: TicketStatus.OPEN,
            }
          : {}),
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
    userRole: Role,
    userSupportArea: SupportArea | null,
    userAcademicDepartment: AcademicDepartment | null,
    file: Express.Multer.File,
  ) {
    const ticket = await this.getTicketById(ticketId);
    this.assertTicketViewAccess(
      ticket,
      userId,
      userRole,
      userSupportArea,
      userAcademicDepartment,
    );

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
    actorSupportArea: SupportArea | null,
    actorAcademicDepartment: AcademicDepartment | null,
  ) {
    const ticket = await this.getTicketById(ticketId);
    this.assertTicketViewAccess(
      ticket,
      actorId,
      actorRole,
      actorSupportArea,
      actorAcademicDepartment,
    );

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

  async createMessage(
    ticketId: string,
    actorId: string,
    actorRole: Role,
    actorSupportArea: SupportArea | null,
    actorAcademicDepartment: AcademicDepartment | null,
    dto: CreateTicketMessageDto,
  ) {
    const ticket = await this.getTicketById(ticketId);
    this.assertTicketViewAccess(
      ticket,
      actorId,
      actorRole,
      actorSupportArea,
      actorAcademicDepartment,
    );
    this.assertTicketMessageAccess(ticket, actorId, actorRole);

    const message = dto.message.trim();

    await this.prisma.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        actorId,
        eventType: 'MESSAGE',
        payload: {
          message,
        },
      },
    });

    const recipientIds =
      actorRole === Role.STUDENT
        ? ticket.assigneeId
          ? [ticket.assigneeId]
          : []
        : [ticket.studentId];

    await this.notificationsService.createMany(
      recipientIds.filter((recipientId) => recipientId !== actorId),
      NotificationType.TICKET_UPDATED,
      'New ticket message',
      `There is a new message on ticket ${ticket.id}.`,
    );

    return this.getAccessibleTicketById(
      ticket.id,
      actorId,
      actorRole,
      actorSupportArea,
      actorAcademicDepartment,
    );
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

  private assertTicketViewAccess(
    ticket: TicketDetail,
    actorId: string,
    actorRole: Role,
    actorSupportArea?: SupportArea | null,
    actorAcademicDepartment?: AcademicDepartment | null,
  ): void {
    if (actorRole === Role.ADMIN) {
      return;
    }

    if (actorRole === Role.STUDENT && ticket.studentId !== actorId) {
      throw new ForbiddenException(
        'Students can only access their own tickets.',
      );
    }

    if (actorRole === Role.STAFF) {
      this.assertStaffRoutingAssignment(
        actorSupportArea,
        actorAcademicDepartment,
      );
    }

    if (
      actorRole === Role.STAFF &&
      (ticket.supportArea !== actorSupportArea ||
        ticket.academicDepartment !== actorAcademicDepartment)
    ) {
      throw new ForbiddenException(
        'Staff can only access tickets in their assigned support lane.',
      );
    }

    if (
      actorRole === Role.STAFF &&
      ticket.assigneeId &&
      ticket.assigneeId !== actorId
    ) {
      throw new ForbiddenException(
        'This ticket is already assigned to another staff member.',
      );
    }
  }

  private assertTicketMessageAccess(
    ticket: TicketDetail,
    actorId: string,
    actorRole: Role,
  ): void {
    if (actorRole === Role.ADMIN || actorRole === Role.STUDENT) {
      return;
    }

    if (ticket.assigneeId !== actorId) {
      throw new ForbiddenException(
        'Claim this ticket before replying to the student.',
      );
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
      ...(query.supportArea ? { supportArea: query.supportArea } : {}),
      ...(query.academicDepartment
        ? { academicDepartment: query.academicDepartment }
        : {}),
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

  private assertStaffRoutingAssignment(
    supportArea?: SupportArea | null,
    academicDepartment?: AcademicDepartment | null,
  ): void {
    if (!supportArea || !academicDepartment) {
      throw new ForbiddenException(
        'Your staff routing assignment is incomplete. Contact an admin before using the queue.',
      );
    }
  }
}

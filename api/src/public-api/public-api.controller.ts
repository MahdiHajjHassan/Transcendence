import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { SearchKnowledgeQueryDto } from '../knowledge/dto/search-knowledge-query.dto';
import { PublicCreateTicketDto } from './dto/public-create-ticket.dto';
import { PublicUpdateTicketDto } from './dto/public-update-ticket.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { Role } from '@prisma/client';

@Controller('public')
@UseGuards(ApiKeyGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class PublicApiController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly prisma: PrismaService,
    private readonly ticketsService: TicketsService,
  ) {}

  @Get('knowledge/search')
  searchKnowledge(@Query() query: SearchKnowledgeQueryDto) {
    return this.knowledgeService.search(query);
  }

  @Get('docs')
  docs() {
    return {
      name: 'College Support Public API',
      auth: {
        type: 'API Key',
        header: 'x-api-key',
      },
      endpoints: [
        'GET /api/public/docs',
        'GET /api/public/knowledge/search?q=&department=&page=&limit=',
        'POST /api/public/tickets',
        'GET /api/public/tickets/:ticketId',
        'PUT /api/public/tickets/:ticketId',
        'DELETE /api/public/tickets/:ticketId/attachments/:attachmentId',
      ],
    };
  }

  @Post('tickets')
  async createTicket(@Body() dto: PublicCreateTicketDto) {
    const student = await this.prisma.user.findUnique({
      where: {
        schoolId: dto.studentSchoolId,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return {
        error: 'Student does not exist.',
      };
    }

    return this.ticketsService.createTicket(student.id, {
      department: dto.department,
      subject: dto.subject,
      description: dto.description,
    });
  }

  @Get('tickets/:ticketId')
  getTicket(@Param('ticketId') ticketId: string) {
    return this.ticketsService.getTicketById(ticketId);
  }

  @Put('tickets/:ticketId')
  async updateTicket(
    @Param('ticketId') ticketId: string,
    @Body() dto: PublicUpdateTicketDto,
  ) {
    const admin = await this.prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
        active: true,
      },
      select: {
        id: true,
      },
    });

    if (!admin) {
      return { error: 'No admin account available for public API actions.' };
    }

    return this.ticketsService.updateTicket(
      ticketId,
      admin.id,
      Role.ADMIN,
      dto,
    );
  }

  @Delete('tickets/:ticketId/attachments/:attachmentId')
  async deleteAttachment(
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const admin = await this.prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
        active: true,
      },
      select: {
        id: true,
      },
    });

    if (!admin) {
      return { error: 'No admin account available for public API actions.' };
    }

    return this.ticketsService.removeAttachment(
      ticketId,
      attachmentId,
      admin.id,
      Role.ADMIN,
    );
  }
}

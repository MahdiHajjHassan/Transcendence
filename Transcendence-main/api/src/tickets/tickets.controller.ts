import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AcademicDepartment,
  Role,
  SupportArea,
} from '../common/enums';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @Roles(Role.STUDENT)
  createTicket(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.createTicket(userId, dto);
  }

  @Get('my')
  @Roles(Role.STUDENT)
  listMy(
    @CurrentUser('userId') userId: string,
    @Query() query: ListTicketsQueryDto,
  ) {
    return this.ticketsService.listMyTickets(userId, query);
  }

  @Get('queue')
  @Roles(Role.STAFF, Role.ADMIN)
  listQueue(
    @CurrentUser('userId') userId: string,
    @CurrentUser('supportArea') supportArea: SupportArea | null,
    @CurrentUser('academicDepartment')
    academicDepartment: AcademicDepartment | null,
    @CurrentUser('role') role: Role,
    @Query() query: ListTicketsQueryDto,
  ) {
    return this.ticketsService.listQueue(
      query,
      userId,
      role,
      supportArea,
      academicDepartment,
    );
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('supportArea') supportArea: SupportArea | null,
    @CurrentUser('academicDepartment')
    academicDepartment: AcademicDepartment | null,
  ) {
    return this.ticketsService.getAccessibleTicketById(
      id,
      userId,
      role,
      supportArea,
      academicDepartment,
    );
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('supportArea') supportArea: SupportArea | null,
    @CurrentUser('academicDepartment')
    academicDepartment: AcademicDepartment | null,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.updateTicket(
      id,
      userId,
      role,
      supportArea,
      academicDepartment,
      dto,
    );
  }

  @Post(':id/claim')
  @Roles(Role.STAFF, Role.ADMIN)
  claim(
    @Param('id') id: string,
    @CurrentUser('userId') staffId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('supportArea') supportArea: SupportArea | null,
    @CurrentUser('academicDepartment')
    academicDepartment: AcademicDepartment | null,
  ) {
    return this.ticketsService.claim(
      id,
      staffId,
      role,
      supportArea,
      academicDepartment,
    );
  }

  @Patch(':id/status')
  @Roles(Role.STAFF, Role.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('userId') actorId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('supportArea') supportArea: SupportArea | null,
    @CurrentUser('academicDepartment')
    academicDepartment: AcademicDepartment | null,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(
      id,
      actorId,
      role,
      supportArea,
      academicDepartment,
      dto,
    );
  }

  @Post(':id/messages')
  createMessage(
    @Param('id') id: string,
    @CurrentUser('userId') actorId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('supportArea') supportArea: SupportArea | null,
    @CurrentUser('academicDepartment')
    academicDepartment: AcademicDepartment | null,
    @Body() dto: CreateTicketMessageDto,
  ) {
    return this.ticketsService.createMessage(
      id,
      actorId,
      role,
      supportArea,
      academicDepartment,
      dto,
    );
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  addAttachment(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('supportArea') supportArea: SupportArea | null,
    @CurrentUser('academicDepartment')
    academicDepartment: AcademicDepartment | null,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.ticketsService.addAttachment(
      id,
      userId,
      role,
      supportArea,
      academicDepartment,
      file,
    );
  }

  @Delete(':id/attachments/:attachmentId')
  deleteAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser('userId') actorId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('supportArea') supportArea: SupportArea | null,
    @CurrentUser('academicDepartment')
    academicDepartment: AcademicDepartment | null,
  ) {
    return this.ticketsService.removeAttachment(
      id,
      attachmentId,
      actorId,
      role,
      supportArea,
      academicDepartment,
    );
  }
}

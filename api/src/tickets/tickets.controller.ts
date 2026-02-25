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
import { Department, Role } from '../common/enums';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @Roles(Role.STUDENT, Role.STAFF, Role.ADMIN)
  @UseGuards(RolesGuard)
  createTicket(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.createTicket(userId, dto);
  }

  @Get('my')
  listMy(
    @CurrentUser('userId') userId: string,
    @Query() query: ListTicketsQueryDto,
  ) {
    return this.ticketsService.listMyTickets(userId, query);
  }

  @Get('queue')
  @Roles(Role.STAFF, Role.ADMIN)
  @UseGuards(RolesGuard)
  listQueue(
    @CurrentUser('department') department: Department | null,
    @CurrentUser('role') role: Role,
    @Query() query: ListTicketsQueryDto,
  ) {
    const scopedDepartment =
      role === Role.ADMIN ? (query.department ?? null) : department;
    return this.ticketsService.listQueue(query, scopedDepartment);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.ticketsService.getTicketById(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.updateTicket(id, userId, role, dto);
  }

  @Post(':id/claim')
  @Roles(Role.STAFF, Role.ADMIN)
  @UseGuards(RolesGuard)
  claim(@Param('id') id: string, @CurrentUser('userId') staffId: string) {
    return this.ticketsService.claim(id, staffId);
  }

  @Patch(':id/status')
  @Roles(Role.STAFF, Role.ADMIN)
  @UseGuards(RolesGuard)
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('userId') actorId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(id, actorId, dto);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  addAttachment(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.ticketsService.addAttachment(id, userId, file);
  }

  @Delete(':id/attachments/:attachmentId')
  deleteAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser('userId') actorId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.ticketsService.removeAttachment(
      id,
      attachmentId,
      actorId,
      role,
    );
  }
}

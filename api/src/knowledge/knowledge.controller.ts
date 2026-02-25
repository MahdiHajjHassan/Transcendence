import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { KnowledgeService } from './knowledge.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { CreateKnowledgeDocumentDto } from './dto/create-document.dto';
import { SearchKnowledgeQueryDto } from './dto/search-knowledge-query.dto';

@Controller()
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('admin/faq')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  createFaq(@Body() dto: CreateFaqDto) {
    return this.knowledgeService.createFaq(dto);
  }

  @Post('admin/knowledge/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  createDocument(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateKnowledgeDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.knowledgeService.createDocument(userId, dto, file);
  }

  @Get('knowledge/search')
  @UseGuards(JwtAuthGuard)
  search(@Query() query: SearchKnowledgeQueryDto) {
    return this.knowledgeService.search(query);
  }
}

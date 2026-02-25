import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AssistantService } from './assistant.service';
import { AssistantMessageDto } from './dto/assistant-message.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Department } from '../common/enums';

@Controller('assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('message')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  message(
    @CurrentUser()
    user: {
      userId: string;
      schoolId: string;
      role: Role;
      department: Department | null;
    },
    @Body() dto: AssistantMessageDto,
  ) {
    return this.assistantService.message(user, dto);
  }
}

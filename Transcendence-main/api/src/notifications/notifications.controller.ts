import { Controller, Get, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread-count')
  async unreadCount(
    @CurrentUser('userId') userId: string,
  ): Promise<{ unread: number }> {
    const unread = await this.notificationsService.getUnreadCount(userId);
    return { unread };
  }
}

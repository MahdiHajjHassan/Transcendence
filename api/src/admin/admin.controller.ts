import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('api-keys')
  async createApiKey(@Body() dto: CreateApiKeyDto) {
    const plainKey = randomBytes(24).toString('hex');
    const hashedKey = createHash('sha256').update(plainKey).digest('hex');

    const created = await this.prisma.apiKey.create({
      data: {
        label: dto.label,
        hashedKey,
        scopes: dto.scopes ?? ['public:knowledge', 'public:tickets'],
        active: dto.active ?? true,
      },
      select: {
        id: true,
        label: true,
        createdAt: true,
      },
    });

    return {
      ...created,
      key: plainKey,
    };
  }

  @Get('traces')
  async traces(@Query('limit') limit = '50') {
    const parsed = Math.max(1, Math.min(200, Number(limit) || 50));
    return this.prisma.orchestratorTrace.findMany({
      orderBy: { createdAt: 'desc' },
      take: parsed,
      include: {
        user: {
          select: {
            schoolId: true,
          },
        },
      },
    });
  }
}

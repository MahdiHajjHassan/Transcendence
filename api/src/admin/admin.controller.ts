import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AcademicDepartment,
  Role,
  SupportArea,
  TicketStatus,
} from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateUserRoutingDto } from './dto/update-user-routing.dto';

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

  @Get('users')
  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { schoolId: 'asc' }],
      select: {
        id: true,
        schoolId: true,
        email: true,
        role: true,
        active: true,
        supportArea: true,
        academicDepartment: true,
        profile: {
          select: {
            fullName: true,
          },
        },
      },
    });

    return users.map((user) => this.serializeUser(user));
  }

  @Patch('users/:id/routing')
  async updateUserRouting(
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoutingDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        supportArea: true,
        academicDepartment: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const hasSupportArea = Object.prototype.hasOwnProperty.call(dto, 'supportArea');
    const hasAcademicDepartment = Object.prototype.hasOwnProperty.call(
      dto,
      'academicDepartment',
    );

    let nextSupportArea = hasSupportArea ? dto.supportArea ?? null : user.supportArea;
    let nextAcademicDepartment = hasAcademicDepartment
      ? dto.academicDepartment ?? null
      : user.academicDepartment;

    if (user.role === Role.ADMIN) {
      nextSupportArea = null;
      nextAcademicDepartment = null;
    }

    if (user.role === Role.STUDENT) {
      nextSupportArea = null;
    }

    if (user.role === Role.STAFF && (!nextSupportArea || !nextAcademicDepartment)) {
      throw new BadRequestException(
        'Staff accounts require both a support area and an academic department.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id: userId },
        data: {
          supportArea: nextSupportArea,
          academicDepartment: nextAcademicDepartment,
        },
        select: {
          id: true,
          schoolId: true,
          email: true,
          role: true,
          active: true,
          supportArea: true,
          academicDepartment: true,
          profile: {
            select: {
              fullName: true,
            },
          },
        },
      });

      if (result.role === Role.STUDENT && result.academicDepartment) {
        await tx.ticket.updateMany({
          where: {
            studentId: result.id,
            academicDepartment: null,
            status: {
              not: TicketStatus.RESOLVED,
            },
          },
          data: {
            academicDepartment: result.academicDepartment,
          },
        });
      }

      return result;
    });

    return this.serializeUser(updated);
  }

  private serializeUser(user: {
    id: string;
    schoolId: string;
    email: string | null;
    role: Role;
    active: boolean;
    supportArea: SupportArea | null;
    academicDepartment: AcademicDepartment | null;
    profile: { fullName: string } | null;
  }) {
    const needsAssignment =
      user.role === Role.STUDENT
        ? !user.academicDepartment
        : user.role === Role.STAFF
          ? !user.supportArea || !user.academicDepartment
          : false;

    return {
      ...user,
      assignmentStatus:
        user.role === Role.ADMIN
          ? 'GLOBAL'
          : needsAssignment
            ? 'UNASSIGNED'
            : 'ASSIGNED',
      needsAssignment,
    };
  }
}

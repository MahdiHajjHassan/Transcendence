import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string): Promise<{
    id: string;
    schoolId: string;
    email: string | null;
    role: string;
    department: string | null;
    profile: { fullName: string; avatarUrl: string | null } | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        schoolId: true,
        email: true,
        role: true,
        department: true,
        profile: {
          select: {
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<{ success: boolean }> {
    await this.prisma.profile.upsert({
      where: {
        userId,
      },
      update: {
        ...(dto.fullName ? { fullName: dto.fullName } : {}),
        ...(dto.avatarUrl ? { avatarUrl: dto.avatarUrl } : {}),
      },
      create: {
        userId,
        fullName: dto.fullName ?? 'Student',
        avatarUrl: dto.avatarUrl,
      },
    });

    return { success: true };
  }
}

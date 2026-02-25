import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { Department, Role } from '../common/enums';
import { ProvisionUserDto } from './dto/provision-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registerStudent(
    dto: RegisterStudentDto,
  ): Promise<{ accessToken: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { schoolId: dto.schoolId },
    });

    if (existing) {
      throw new UnauthorizedException('School ID already registered.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const user = await this.prisma.user.create({
      data: {
        schoolId: dto.schoolId,
        passwordHash,
        role: Role.STUDENT,
        profile: {
          create: {
            fullName: dto.fullName,
          },
        },
      },
    });

    return this.signToken(user.id, user.schoolId, Role.STUDENT, null);
  }

  async provisionUser(
    dto: ProvisionUserDto,
  ): Promise<{ id: string; schoolId: string }> {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const created = await this.prisma.user.create({
      data: {
        schoolId: dto.schoolId,
        email: dto.email,
        passwordHash,
        role: dto.role,
        department: dto.department,
        profile: {
          create: {
            fullName: dto.fullName,
          },
        },
      },
      select: {
        id: true,
        schoolId: true,
      },
    });

    return created;
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { schoolId: dto.schoolId },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.signToken(
      user.id,
      user.schoolId,
      user.role,
      user.department ?? null,
    );
  }

  private async signToken(
    userId: string,
    schoolId: string,
    role: Role,
    department: Department | null,
  ): Promise<{ accessToken: string }> {
    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = Number(
      this.configService.get<string>('JWT_EXPIRES_IN_SECONDS') ?? '28800',
    );

    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        schoolId,
        role,
        department,
      },
      {
        secret,
        expiresIn,
      },
    );

    return { accessToken };
  }
}

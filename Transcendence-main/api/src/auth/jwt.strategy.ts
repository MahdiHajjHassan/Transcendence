import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AcademicDepartment,
  Role,
  SupportArea,
} from '../common/enums';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'change-me',
    });
  }

  validate(payload: {
    sub: string;
    schoolId: string;
    role: Role;
    supportArea?: SupportArea | null;
    department?: SupportArea | null;
    academicDepartment?: AcademicDepartment | null;
  }): {
    userId: string;
    schoolId: string;
    role: Role;
    supportArea: SupportArea | null;
    academicDepartment: AcademicDepartment | null;
  } {
    return {
      userId: payload.sub,
      schoolId: payload.schoolId,
      role: payload.role,
      supportArea: payload.supportArea ?? payload.department ?? null,
      academicDepartment: payload.academicDepartment ?? null,
    };
  }
}

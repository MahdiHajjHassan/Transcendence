import type { Request } from 'express';
import type { AcademicDepartment, Role, SupportArea } from '../enums';

export type JwtUser = {
  userId: string;
  schoolId: string;
  role: Role;
  supportArea: SupportArea | null;
  academicDepartment: AcademicDepartment | null;
};

export type RequestWithUser = Request & {
  user?: JwtUser;
};

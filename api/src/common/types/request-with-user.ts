import type { Request } from 'express';
import type { Department, Role } from '../enums';

export type JwtUser = {
  userId: string;
  schoolId: string;
  role: Role;
  department: Department | null;
};

export type RequestWithUser = Request & {
  user?: JwtUser;
};

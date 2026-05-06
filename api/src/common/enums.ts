export const ROLES_KEY = 'roles';

export {
  AcademicDepartment,
  Role,
  SupportArea,
  TicketStatus,
} from '@prisma/client';

export enum AgentIntent {
  KNOWLEDGE = 'KNOWLEDGE',
  WORKFLOW = 'WORKFLOW',
  MIXED = 'MIXED',
}

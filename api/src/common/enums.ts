export const ROLES_KEY = 'roles';

export { Department, Role, TicketStatus } from '@prisma/client';

export enum AgentIntent {
  KNOWLEDGE = 'KNOWLEDGE',
  WORKFLOW = 'WORKFLOW',
  MIXED = 'MIXED',
}

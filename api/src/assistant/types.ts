import { AgentIntent, Department } from '../common/enums';

export type Citation = {
  sourceId: string;
  title: string;
};

export type AssistantResponse = {
  traceId: string;
  intent: AgentIntent;
  message: string;
  confidence?: number;
  citations?: Citation[];
  ticketSuggestion?: {
    allowed: boolean;
    reason?: string;
  };
  ticketId?: string;
};

export type AssistantUser = {
  userId: string;
  schoolId: string;
  role: string;
  department: Department | null;
};

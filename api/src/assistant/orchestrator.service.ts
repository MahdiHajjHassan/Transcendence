import { Injectable } from '@nestjs/common';
import { AgentIntent, Department } from '../common/enums';

@Injectable()
export class OrchestratorService {
  classifyIntent(message: string): AgentIntent {
    const lower = message.toLowerCase();
    const workflowSignals = [
      'ticket',
      'status',
      'open request',
      'create request',
      'escalate',
      'support request',
    ];
    const knowledgeSignals = [
      'where',
      'how',
      'what',
      'when',
      'who',
      'policy',
      'document',
      'registration',
      'it',
    ];

    const hasWorkflow = workflowSignals.some((signal) =>
      lower.includes(signal),
    );
    const hasKnowledge = knowledgeSignals.some((signal) =>
      lower.includes(signal),
    );

    if (hasWorkflow && hasKnowledge) {
      return AgentIntent.MIXED;
    }

    if (hasWorkflow) {
      return AgentIntent.WORKFLOW;
    }

    return AgentIntent.KNOWLEDGE;
  }

  detectDepartment(message: string): Department | undefined {
    const lower = message.toLowerCase();
    if (
      lower.includes('it') ||
      lower.includes('wifi') ||
      lower.includes('network') ||
      lower.includes('password')
    ) {
      return Department.IT;
    }

    if (
      lower.includes('registration') ||
      lower.includes('enroll') ||
      lower.includes('document') ||
      lower.includes('paper')
    ) {
      return Department.REGISTRATION;
    }

    return undefined;
  }
}

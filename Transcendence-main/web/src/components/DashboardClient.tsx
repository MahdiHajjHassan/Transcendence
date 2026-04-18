'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFormRequest, apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';
import { AdminUsersPanel } from '@/components/AdminUsersPanel';
import {
  academicDepartmentOptions,
  AcademicDepartment,
  formatAcademicDepartment,
  formatRoutingLane,
  formatSupportArea,
  SupportArea,
  supportAreaOptions,
} from '@/lib/routing';

type MeResponse = {
  id: string;
  schoolId: string;
  email: string | null;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  supportArea: SupportArea | null;
  academicDepartment: AcademicDepartment | null;
  profile: { fullName: string; avatarUrl: string | null } | null;
};

type Ticket = {
  id: string;
  supportArea: SupportArea;
  academicDepartment: AcademicDepartment | null;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  attachments: Array<{ id: string; fileName: string }>;
};

type AssistantResponse = {
  traceId: string;
  intent: 'KNOWLEDGE' | 'WORKFLOW' | 'MIXED';
  message: string;
  confidence?: number;
  citations?: Array<{ sourceId: string; title: string }>;
  ticketSuggestion?: { allowed: boolean; reason?: string };
  ticketId?: string;
};

const staffAssistantPrompts = [
  {
    label: 'Registration checklist',
    prompt: 'Summarize the required documents for registration reinstatement.',
    supportArea: 'REGISTRATION' as const,
  },
  {
    label: 'Student follow-up',
    prompt: 'Draft a short update I can send to a student whose IT request is still being investigated.',
    supportArea: 'IT' as const,
  },
  {
    label: 'Queue triage',
    prompt: 'What details should I confirm before resolving a registration support ticket?',
    supportArea: 'REGISTRATION' as const,
  },
];

const adminAssistantPrompts = [
  {
    label: 'Operations snapshot',
    prompt: 'Summarize the highest-priority issues an admin should review across registration and IT today.',
    supportArea: 'REGISTRATION' as const,
  },
  {
    label: 'Knowledge gaps',
    prompt: 'List the most common questions that should become FAQ entries for the registration team.',
    supportArea: 'REGISTRATION' as const,
  },
  {
    label: 'Escalation guide',
    prompt: 'Create a short escalation checklist for staff handling unresolved IT tickets.',
    supportArea: 'IT' as const,
  },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function DashboardClient() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [queueTickets, setQueueTickets] = useState<Ticket[]>([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantSupportArea, setAssistantSupportArea] = useState<SupportArea>('REGISTRATION');
  const [assistantEscalate, setAssistantEscalate] = useState(false);
  const [assistantLog, setAssistantLog] = useState<Array<{ from: 'user' | 'assistant'; text: string }>>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ticketForm, setTicketForm] = useState({
    supportArea: 'REGISTRATION' as SupportArea,
    subject: '',
    description: '',
  });
  const [ticketFile, setTicketFile] = useState<File | null>(null);

  const [faqForm, setFaqForm] = useState({
    supportArea: 'REGISTRATION' as SupportArea,
    question: '',
    answer: '',
    tags: '',
  });

  const [docForm, setDocForm] = useState({
    supportArea: 'REGISTRATION' as SupportArea,
    title: '',
    content: '',
  });
  const [docFile, setDocFile] = useState<File | null>(null);

  const [provisionForm, setProvisionForm] = useState({
    schoolId: '',
    fullName: '',
    password: '',
    role: 'STAFF' as 'STAFF' | 'ADMIN',
    supportArea: 'REGISTRATION' as SupportArea,
    academicDepartment: 'ENGINEERING' as AcademicDepartment,
    email: '',
  });

  const [apiKeyLabel, setApiKeyLabel] = useState('');
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [traces, setTraces] = useState<Array<{ id: string; intent: string; createdAt: string; user: { schoolId: string } }>>([]);

  const roleBadgeClass = useMemo(() => {
    if (me?.role === 'ADMIN') {
      return 'badge warn';
    }
    if (me?.role === 'STAFF') {
      return 'badge';
    }
    return 'badge success';
  }, [me?.role]);

  const isStudent = me?.role === 'STUDENT';
  const isStaffOrAdmin = me?.role === 'STAFF' || me?.role === 'ADMIN';
  const openQueueCount = queueTickets.filter((ticket) => ticket.status === 'OPEN').length;
  const inProgressQueueCount = queueTickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length;
  const resolvedQueueCount = queueTickets.filter((ticket) => ticket.status === 'RESOLVED').length;
  const queueScopeLabel =
    me?.role === 'ADMIN'
      ? 'All Support Lanes'
      : formatRoutingLane(me?.supportArea, me?.academicDepartment);
  const assistantPrompts =
    me?.role === 'ADMIN' ? adminAssistantPrompts : me?.role === 'STAFF' ? staffAssistantPrompts : [];
  const dashboardTitle =
    me?.role === 'ADMIN'
      ? 'Run support operations across departments'
      : me?.role === 'STAFF'
        ? 'Work your support queue with AI at your side'
        : 'Get answers fast and submit support requests when needed';
  const dashboardSummary =
    me?.role === 'ADMIN'
      ? 'Monitor queue health, strengthen knowledge coverage, provision teammates, and step in when cases need oversight.'
      : me?.role === 'STAFF'
        ? 'Use the assistant for grounded answers, claim the right tickets, and move students through the process without dead UI getting in the way.'
        : 'Ask the assistant about official processes, then create and track your own tickets from the same place.';

  const applyAssistantPrompt = (
    prompt: string,
    supportArea: SupportArea,
  ) => {
    setAssistantSupportArea(supportArea);
    setAssistantInput(prompt);
  };

  const loadInitial = async () => {
    try {
      setLoading(true);
      const [meData, unreadData] = await Promise.all([
        apiRequest<MeResponse>('/me'),
        apiRequest<{ unread: number }>('/notifications/unread-count'),
      ]);

      setMe(meData);
      setUnread(unreadData.unread);

      if (meData.role === 'STUDENT') {
        const myTicketData = await apiRequest<{ items: Ticket[] }>('/tickets/my');
        setMyTickets(myTicketData.items);
        setQueueTickets([]);
      } else {
        setMyTickets([]);
        const queue = await apiRequest<{ items: Ticket[] }>('/tickets/queue');
        setQueueTickets(queue.items);
      }

      if (meData.role === 'ADMIN') {
        const traceList = await apiRequest<Array<{ id: string; intent: string; createdAt: string; user: { schoolId: string } }>>('/admin/traces?limit=20');
        setTraces(traceList);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }

    void loadInitial();
  }, [router]);

  const logout = () => {
    clearToken();
    router.push('/login');
  };

  const openTicket = (ticketId: string) => {
    router.push(`/dashboard/tickets/${ticketId}`);
  };

  const sendAssistant = async (event: FormEvent) => {
    event.preventDefault();
    if (!assistantInput.trim()) {
      return;
    }

    const question = assistantInput;
    setAssistantInput('');
    setAssistantLog((prev) => [...prev, { from: 'user', text: question }]);

    try {
      const response = await apiRequest<AssistantResponse>('/assistant/message', {
        method: 'POST',
        body: JSON.stringify({
          message: question,
          supportArea: assistantSupportArea,
          createTicketOnDecline: me?.role === 'STUDENT' ? assistantEscalate : false,
        }),
      });

      const citationText = response.citations?.length
        ? `\nSources: ${response.citations.map((item) => item.title).join(' | ')}`
        : '';

      setAssistantLog((prev) => [
        ...prev,
        {
          from: 'assistant',
          text: `${response.message}${citationText}`,
        },
      ]);

      if (response.ticketId) {
        await loadInitial();
      }
    } catch (requestError) {
      setAssistantLog((prev) => [
        ...prev,
        {
          from: 'assistant',
          text: requestError instanceof Error ? requestError.message : 'Assistant failed',
        },
      ]);
    }
  };

  const createTicket = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const created = await apiRequest<Ticket>('/tickets', {
        method: 'POST',
        body: JSON.stringify(ticketForm),
      });

      if (ticketFile) {
        const data = new FormData();
        data.append('file', ticketFile);
        await apiFormRequest(`/tickets/${created.id}/attachments`, data);
      }

      setTicketForm({ supportArea: 'REGISTRATION', subject: '', description: '' });
      setTicketFile(null);
      await loadInitial();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not create ticket');
    }
  };

  const claimTicket = async (ticketId: string) => {
    setError(null);
    try {
      await apiRequest(`/tickets/${ticketId}/claim`, { method: 'POST' });
      await loadInitial();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not claim ticket');
    }
  };

  const setTicketStatus = async (ticketId: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') => {
    setError(null);
    try {
      await apiRequest(`/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadInitial();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update ticket status');
    }
  };

  const submitFaq = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest('/admin/faq', {
      method: 'POST',
      body: JSON.stringify({
        supportArea: faqForm.supportArea,
        question: faqForm.question,
        answer: faqForm.answer,
        tags: faqForm.tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });
    setFaqForm({ supportArea: 'REGISTRATION', question: '', answer: '', tags: '' });
  };

  const submitDocument = async (event: FormEvent) => {
    event.preventDefault();
    const data = new FormData();
    data.append('supportArea', docForm.supportArea);
    data.append('title', docForm.title);
    if (docForm.content.trim()) {
      data.append('content', docForm.content);
    }
    if (docFile) {
      data.append('file', docFile);
    }

    await apiFormRequest('/admin/knowledge/documents', data);
    setDocForm({ supportArea: 'REGISTRATION', title: '', content: '' });
    setDocFile(null);
  };

  const provisionUser = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest('/auth/admin/provision', {
      method: 'POST',
      body: JSON.stringify({
        ...provisionForm,
        supportArea:
          provisionForm.role === 'STAFF' ? provisionForm.supportArea : undefined,
        academicDepartment:
          provisionForm.role === 'STAFF' ? provisionForm.academicDepartment : undefined,
        email: provisionForm.email || undefined,
      }),
    });
    setProvisionForm({
      schoolId: '',
      fullName: '',
      password: '',
      role: 'STAFF',
      supportArea: 'REGISTRATION',
      academicDepartment: 'ENGINEERING',
      email: '',
    });
  };

  const generateApiKey = async () => {
    const response = await apiRequest<{ key: string }>('/admin/api-keys', {
      method: 'POST',
      body: JSON.stringify({ label: apiKeyLabel || 'Public Integration Key' }),
    });
    setCreatedApiKey(response.key);
    setApiKeyLabel('');
  };

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (!me) {
    return (
      <div className="card stack">
        <p>Unable to load profile.</p>
        <button onClick={logout}>Back to Login</button>
      </div>
    );
  }

  return (
    <div className="stack">
      <section className={`card dashboard-hero ${isStaffOrAdmin ? 'staff-hero' : ''}`}>
        <div className="stack">
          <div className="row wrap-actions">
            <span className={roleBadgeClass}>{me.role}</span>
            {me.supportArea ? <span className="badge subtle">{formatSupportArea(me.supportArea)}</span> : null}
            {me.academicDepartment ? (
              <span className="badge subtle">{formatAcademicDepartment(me.academicDepartment)}</span>
            ) : null}
          </div>
          <div className="stack hero-copy">
            <h2>{me.profile?.fullName ?? me.schoolId}</h2>
            <p className="small hero-kicker">{dashboardTitle}</p>
            <p>{dashboardSummary}</p>
          </div>
        </div>
        <div className="hero-meta">
          <div className="hero-stat">
            <span className="small">School ID</span>
            <strong className="code">{me.schoolId}</strong>
          </div>
          <div className="hero-stat">
            <span className="small">Unread alerts</span>
            <strong>{unread}</strong>
          </div>
          <div className="hero-stat">
            <span className="small">Workspace</span>
            <strong>{isStaffOrAdmin ? queueScopeLabel : 'Student Portal'}</strong>
          </div>
        </div>
      </section>

      {error ? <p style={{ color: 'var(--warn)' }}>{error}</p> : null}

      {isStaffOrAdmin ? (
        <section className="metric-grid">
          <article className="metric-card">
            <p className="small">Queue scope</p>
            <strong className="metric-value">{queueScopeLabel}</strong>
          </article>
          <article className="metric-card">
            <p className="small">Open tickets</p>
            <strong className="metric-value">{openQueueCount}</strong>
          </article>
          <article className="metric-card">
            <p className="small">In progress</p>
            <strong className="metric-value">{inProgressQueueCount}</strong>
          </article>
          <article className="metric-card">
            <p className="small">Resolved</p>
            <strong className="metric-value">{resolvedQueueCount}</strong>
          </article>
        </section>
      ) : null}

      <section className={isStudent ? 'grid-2' : 'operations-layout'}>
        <article className={`card stack ${isStaffOrAdmin ? 'workspace-card' : ''}`}>
          <div className="panel-header">
            <div className="stack" style={{ gap: 4 }}>
              <p className="eyebrow">AI Workspace</p>
              <h3>Assistant</h3>
              <p className="small">
                {isStudent
                  ? 'Orchestrator routes your message to KnowledgeAgent and/or WorkflowAgent.'
                  : 'Search trusted guidance, draft responses, and keep your queue moving from one focused workspace.'}
              </p>
            </div>
          </div>
          <form className="stack" onSubmit={sendAssistant}>
            <textarea
              value={assistantInput}
              onChange={(event) => setAssistantInput(event.target.value)}
              rows={4}
              placeholder={
                isStudent
                  ? 'Example: Where do I get my registration certificate?'
                  : 'Example: What documents are needed for registration reinstatement?'
              }
              required
            />
            <div className="row">
              <select
                value={assistantSupportArea}
                onChange={(event) => setAssistantSupportArea(event.target.value as SupportArea)}
              >
                {supportAreaOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {me.role === 'STUDENT' ? (
                <label className="row small" style={{ width: 'auto' }}>
                  <input
                    style={{ width: 'auto' }}
                    type="checkbox"
                    checked={assistantEscalate}
                    onChange={(event) => setAssistantEscalate(event.target.checked)}
                  />
                  Auto-escalate if unsure
                </label>
              ) : (
                <span className="small">Use prompts below or type your own request. The queue stays actionable underneath.</span>
              )}
            </div>
            <button>Send</button>
          </form>

          <div className="chat-log">
            {assistantLog.length === 0 ? (
              <div className="chat-empty">
                <strong>No conversation yet.</strong>
                <p className="small">
                  {isStudent
                    ? 'Ask about registration or IT, then escalate if you still need help.'
                    : 'Use the assistant to prepare answers, clarify process steps, or support ticket updates.'}
                </p>
              </div>
            ) : (
              assistantLog.map((entry, index) => (
                <div
                  key={`${entry.from}-${index}`}
                  className={`chat-bubble ${entry.from === 'assistant' ? 'assistant' : 'user'}`}
                >
                  <strong>{entry.from === 'assistant' ? 'Assistant' : 'You'}</strong>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{entry.text}</p>
                </div>
              ))
            )}
          </div>
        </article>

        {isStudent ? (
          <article className="card stack">
            <h3>Create Ticket</h3>
            {me.academicDepartment ? (
              <p className="small">
                Your tickets route to <span className="code">{formatAcademicDepartment(me.academicDepartment)}</span>.
              </p>
            ) : (
              <p style={{ color: 'var(--warn)', margin: 0 }}>
                Your academic department is not assigned yet. Contact an admin before creating a ticket.
              </p>
            )}
            <form className="stack" onSubmit={createTicket}>
              <input value={formatAcademicDepartment(me.academicDepartment)} readOnly />
              <select
                value={ticketForm.supportArea}
                onChange={(event) =>
                  setTicketForm((prev) => ({ ...prev, supportArea: event.target.value as SupportArea }))
                }
                disabled={!me.academicDepartment}
              >
                {supportAreaOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={ticketForm.subject}
                onChange={(event) => setTicketForm((prev) => ({ ...prev, subject: event.target.value }))}
                placeholder="Subject"
                required
                disabled={!me.academicDepartment}
              />
              <textarea
                rows={4}
                value={ticketForm.description}
                onChange={(event) => setTicketForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Describe your issue"
                required
                disabled={!me.academicDepartment}
              />
              <input
                type="file"
                disabled={!me.academicDepartment}
                onChange={(event) => setTicketFile(event.target.files?.[0] ?? null)}
              />
              <button disabled={!me.academicDepartment}>Create Ticket</button>
            </form>
          </article>
        ) : (
          <article className="card stack spotlight-card">
            <div className="panel-header">
              <div className="stack" style={{ gap: 4 }}>
                <p className="eyebrow">Quick Actions</p>
                <h3>{me.role === 'ADMIN' ? 'Operations Shortcuts' : 'Support Shortcuts'}</h3>
                <p className="small">
                  Prefill the assistant with common prompts or refresh the queue before you start triaging.
                </p>
              </div>
              <button className="secondary" type="button" onClick={() => void loadInitial()}>
                Refresh Data
              </button>
            </div>

            <div className="prompt-grid">
              {assistantPrompts.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="prompt-chip"
                  onClick={() => applyAssistantPrompt(item.prompt, item.supportArea)}
                >
                  <span>{item.label}</span>
                  <small>{formatSupportArea(item.supportArea)}</small>
                </button>
              ))}
            </div>

            <div className="callout-card">
              <p className="eyebrow">Workflow</p>
              <h4>{me.role === 'ADMIN' ? 'Lead the operation' : 'Handle the next best ticket'}</h4>
              <p className="small">
                {me.role === 'ADMIN'
                  ? 'Watch overall queue balance, fill knowledge gaps, and step into tickets that need escalation or coordination.'
                  : 'Claim open work, move cases into progress quickly, and use the assistant when you need grounded wording or policy detail.'}
              </p>
            </div>
          </article>
        )}
      </section>

      {isStudent ? (
        <section className="card stack">
          <h3>My Tickets</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Support Area</th>
                  <th>Academic Dept.</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Opened</th>
                  <th>Attachments</th>
                </tr>
              </thead>
              <tbody>
                {myTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="interactive-row"
                    tabIndex={0}
                    onClick={() => openTicket(ticket.id)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) {
                        return;
                      }

                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openTicket(ticket.id);
                      }
                    }}
                  >
                    <td className="code">{ticket.id}</td>
                    <td>{formatSupportArea(ticket.supportArea)}</td>
                    <td>{formatAcademicDepartment(ticket.academicDepartment)}</td>
                    <td>{ticket.subject}</td>
                    <td>
                      <span className={`status-pill ${ticket.status.toLowerCase()}`}>{ticket.status}</span>
                    </td>
                    <td>{formatDateTime(ticket.createdAt)}</td>
                    <td>{ticket.attachments.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {isStaffOrAdmin ? (
        <section className="card stack queue-card">
          <div className="panel-header">
            <div className="stack" style={{ gap: 4 }}>
              <p className="eyebrow">Ticket Queue</p>
              <h3>{me.role === 'ADMIN' ? 'Operations Queue' : 'Department Queue'}</h3>
              <p className="small">
                {me.role === 'ADMIN'
                  ? 'Monitor all departments, claim tickets when needed, and move work through the pipeline.'
                  : `Manage ${formatRoutingLane(me.supportArea, me.academicDepartment)} tickets, claim ownership, and keep students updated.`}
              </p>
            </div>
            <div className="row wrap-actions">
              <span className="badge subtle">{queueScopeLabel}</span>
              <span className="badge">{queueTickets.length} total</span>
              <button className="secondary" type="button" onClick={() => void loadInitial()}>
                Refresh
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Support Area</th>
                  <th>Academic Dept.</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Opened</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queueTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <p className="small" style={{ margin: 0 }}>
                        No tickets are waiting in the queue right now.
                      </p>
                    </td>
                  </tr>
                ) : (
                  queueTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="interactive-row"
                      tabIndex={0}
                      onClick={() => openTicket(ticket.id)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) {
                          return;
                        }

                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openTicket(ticket.id);
                        }
                      }}
                    >
                      <td className="code">{ticket.id}</td>
                      <td>{formatSupportArea(ticket.supportArea)}</td>
                      <td>{formatAcademicDepartment(ticket.academicDepartment)}</td>
                      <td>{ticket.subject}</td>
                      <td>
                        <span className={`status-pill ${ticket.status.toLowerCase()}`}>{ticket.status}</span>
                      </td>
                      <td>{formatDateTime(ticket.createdAt)}</td>
                      <td>
                        <div className="row wrap-actions">
                          <button
                            className="secondary"
                            disabled={ticket.status !== 'OPEN'}
                            onClick={(event) => {
                              event.stopPropagation();
                              void claimTicket(ticket.id);
                            }}
                          >
                            Claim
                          </button>
                          <button
                            className="secondary"
                            disabled={ticket.status === 'IN_PROGRESS'}
                            onClick={(event) => {
                              event.stopPropagation();
                              void setTicketStatus(ticket.id, 'IN_PROGRESS');
                            }}
                          >
                            In Progress
                          </button>
                          <button
                            disabled={ticket.status === 'RESOLVED'}
                            onClick={(event) => {
                              event.stopPropagation();
                              void setTicketStatus(ticket.id, 'RESOLVED');
                            }}
                          >
                            Resolve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {me.role === 'ADMIN' ? (
        <>
          <section className="admin-tool-grid">
            <article className="card stack admin-panel">
              <div className="panel-header">
                <div className="stack" style={{ gap: 4 }}>
                  <p className="eyebrow">Knowledge Base</p>
                  <h3>FAQ + Documents</h3>
                  <p className="small">
                    Keep assistant answers grounded by updating the content staff rely on every day.
                  </p>
                </div>
              </div>
              <form className="stack" onSubmit={submitFaq}>
                <h4>Create FAQ</h4>
                <select
                  value={faqForm.supportArea}
                  onChange={(event) =>
                    setFaqForm((prev) => ({ ...prev, supportArea: event.target.value as SupportArea }))
                  }
                >
                  {supportAreaOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  value={faqForm.question}
                  onChange={(event) => setFaqForm((prev) => ({ ...prev, question: event.target.value }))}
                  placeholder="Question"
                  required
                />
                <textarea
                  rows={3}
                  value={faqForm.answer}
                  onChange={(event) => setFaqForm((prev) => ({ ...prev, answer: event.target.value }))}
                  placeholder="Answer"
                  required
                />
                <input
                  value={faqForm.tags}
                  onChange={(event) => setFaqForm((prev) => ({ ...prev, tags: event.target.value }))}
                  placeholder="tag1, tag2"
                />
                <button>Save FAQ</button>
              </form>

              <form className="stack" onSubmit={submitDocument}>
                <h4>Upload Knowledge Document</h4>
                <select
                  value={docForm.supportArea}
                  onChange={(event) =>
                    setDocForm((prev) => ({ ...prev, supportArea: event.target.value as SupportArea }))
                  }
                >
                  {supportAreaOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  value={docForm.title}
                  onChange={(event) => setDocForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Document title"
                  required
                />
                <textarea
                  rows={4}
                  value={docForm.content}
                  onChange={(event) => setDocForm((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="Optional raw text content"
                />
                <input type="file" onChange={(event) => setDocFile(event.target.files?.[0] ?? null)} />
                <button>Upload Document</button>
              </form>
            </article>

            <article className="card stack admin-panel">
              <div className="panel-header">
                <div className="stack" style={{ gap: 4 }}>
                  <p className="eyebrow">Administration</p>
                  <h3>Provision + API Keys</h3>
                  <p className="small">
                    Create staff accounts, generate integration keys, and review how the orchestrator is being used.
                  </p>
                </div>
              </div>
              <form className="stack" onSubmit={provisionUser}>
                <h4>Provision Staff/Admin</h4>
                <input
                  value={provisionForm.fullName}
                  onChange={(event) => setProvisionForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Full name"
                  required
                />
                <input
                  value={provisionForm.schoolId}
                  onChange={(event) => setProvisionForm((prev) => ({ ...prev, schoolId: event.target.value }))}
                  placeholder="8-digit school ID"
                  required
                />
                <input
                  value={provisionForm.email}
                  onChange={(event) => setProvisionForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email (optional)"
                />
                <input
                  type="password"
                  value={provisionForm.password}
                  onChange={(event) => setProvisionForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Temporary password"
                  required
                />
                <select
                  value={provisionForm.role}
                  onChange={(event) => setProvisionForm((prev) => ({ ...prev, role: event.target.value as 'STAFF' | 'ADMIN' }))}
                >
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <select
                  value={provisionForm.supportArea}
                  onChange={(event) =>
                    setProvisionForm((prev) => ({ ...prev, supportArea: event.target.value as SupportArea }))
                  }
                  disabled={provisionForm.role !== 'STAFF'}
                >
                  {supportAreaOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={provisionForm.academicDepartment}
                  onChange={(event) =>
                    setProvisionForm((prev) => ({
                      ...prev,
                      academicDepartment: event.target.value as AcademicDepartment,
                    }))
                  }
                  disabled={provisionForm.role !== 'STAFF'}
                >
                  {academicDepartmentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button>Create User</button>
              </form>

              <div className="stack">
                <h4>Create Public API Key</h4>
                <input
                  value={apiKeyLabel}
                  onChange={(event) => setApiKeyLabel(event.target.value)}
                  placeholder="Key label"
                />
                <button onClick={generateApiKey}>Generate Key</button>
                {createdApiKey ? (
                  <p>
                    New key: <span className="code">{createdApiKey}</span>
                  </p>
                ) : null}
              </div>

              <div className="stack">
                <h4>Recent Orchestrator Traces</h4>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Intent</th>
                        <th>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {traces.map((trace) => (
                        <tr key={trace.id}>
                          <td className="code">{trace.id}</td>
                          <td>{trace.intent}</td>
                          <td>{trace.user.schoolId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          </section>

          <AdminUsersPanel />
        </>
      ) : null}
    </div>
  );
}

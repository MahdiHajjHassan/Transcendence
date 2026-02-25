'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFormRequest, apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type MeResponse = {
  id: string;
  schoolId: string;
  email: string | null;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  department: 'REGISTRATION' | 'IT' | null;
  profile: { fullName: string; avatarUrl: string | null } | null;
};

type Ticket = {
  id: string;
  department: 'REGISTRATION' | 'IT';
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

export function DashboardClient() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [queueTickets, setQueueTickets] = useState<Ticket[]>([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantDepartment, setAssistantDepartment] = useState<'REGISTRATION' | 'IT'>('REGISTRATION');
  const [assistantEscalate, setAssistantEscalate] = useState(false);
  const [assistantLog, setAssistantLog] = useState<Array<{ from: 'user' | 'assistant'; text: string }>>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ticketForm, setTicketForm] = useState({
    department: 'REGISTRATION' as 'REGISTRATION' | 'IT',
    subject: '',
    description: '',
  });
  const [ticketFile, setTicketFile] = useState<File | null>(null);

  const [faqForm, setFaqForm] = useState({
    department: 'REGISTRATION' as 'REGISTRATION' | 'IT',
    question: '',
    answer: '',
    tags: '',
  });

  const [docForm, setDocForm] = useState({
    department: 'REGISTRATION' as 'REGISTRATION' | 'IT',
    title: '',
    content: '',
  });
  const [docFile, setDocFile] = useState<File | null>(null);

  const [provisionForm, setProvisionForm] = useState({
    schoolId: '',
    fullName: '',
    password: '',
    role: 'STAFF' as 'STAFF' | 'ADMIN',
    department: 'REGISTRATION' as 'REGISTRATION' | 'IT',
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

  const loadInitial = async () => {
    try {
      setLoading(true);
      const [meData, myTicketData, unreadData] = await Promise.all([
        apiRequest<MeResponse>('/me'),
        apiRequest<{ items: Ticket[] }>('/tickets/my'),
        apiRequest<{ unread: number }>('/notifications/unread-count'),
      ]);

      setMe(meData);
      setMyTickets(myTicketData.items);
      setUnread(unreadData.unread);

      if (meData.role !== 'STUDENT') {
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
          department: assistantDepartment,
          createTicketOnDecline: assistantEscalate,
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

      setTicketForm({ department: 'REGISTRATION', subject: '', description: '' });
      setTicketFile(null);
      await loadInitial();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not create ticket');
    }
  };

  const claimTicket = async (ticketId: string) => {
    await apiRequest(`/tickets/${ticketId}/claim`, { method: 'POST' });
    await loadInitial();
  };

  const setTicketStatus = async (ticketId: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') => {
    await apiRequest(`/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await loadInitial();
  };

  const submitFaq = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest('/admin/faq', {
      method: 'POST',
      body: JSON.stringify({
        department: faqForm.department,
        question: faqForm.question,
        answer: faqForm.answer,
        tags: faqForm.tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });
    setFaqForm({ department: 'REGISTRATION', question: '', answer: '', tags: '' });
  };

  const submitDocument = async (event: FormEvent) => {
    event.preventDefault();
    const data = new FormData();
    data.append('department', docForm.department);
    data.append('title', docForm.title);
    if (docForm.content.trim()) {
      data.append('content', docForm.content);
    }
    if (docFile) {
      data.append('file', docFile);
    }

    await apiFormRequest('/admin/knowledge/documents', data);
    setDocForm({ department: 'REGISTRATION', title: '', content: '' });
    setDocFile(null);
  };

  const provisionUser = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest('/auth/admin/provision', {
      method: 'POST',
      body: JSON.stringify({
        ...provisionForm,
        email: provisionForm.email || undefined,
      }),
    });
    setProvisionForm({
      schoolId: '',
      fullName: '',
      password: '',
      role: 'STAFF',
      department: 'REGISTRATION',
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
      <section className="card row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2>{me.profile?.fullName ?? me.schoolId}</h2>
          <p className="small">
            School ID: <span className="code">{me.schoolId}</span> | Unread alerts: <span className="code">{unread}</span>
          </p>
        </div>
        <div className={roleBadgeClass}>{me.role}</div>
      </section>

      {error ? <p style={{ color: 'var(--warn)' }}>{error}</p> : null}

      <section className="grid-2">
        <article className="card stack">
          <h3>Assistant</h3>
          <p className="small">Orchestrator routes your message to KnowledgeAgent and/or WorkflowAgent.</p>
          <form className="stack" onSubmit={sendAssistant}>
            <textarea
              value={assistantInput}
              onChange={(event) => setAssistantInput(event.target.value)}
              rows={4}
              placeholder="Example: Where do I get my registration certificate?"
              required
            />
            <div className="row">
              <select
                value={assistantDepartment}
                onChange={(event) => setAssistantDepartment(event.target.value as 'REGISTRATION' | 'IT')}
              >
                <option value="REGISTRATION">Registration</option>
                <option value="IT">IT</option>
              </select>
              <label className="row small" style={{ width: 'auto' }}>
                <input
                  style={{ width: 'auto' }}
                  type="checkbox"
                  checked={assistantEscalate}
                  onChange={(event) => setAssistantEscalate(event.target.checked)}
                />
                Auto-escalate if unsure
              </label>
            </div>
            <button>Send</button>
          </form>

          <div className="stack" style={{ maxHeight: 280, overflowY: 'auto' }}>
            {assistantLog.map((entry, index) => (
              <div
                key={`${entry.from}-${index}`}
                className="card"
                style={{
                  background: entry.from === 'assistant' ? 'var(--surface-alt)' : '#ebf3ff',
                }}
              >
                <strong>{entry.from === 'assistant' ? 'Assistant' : 'You'}:</strong>
                <p style={{ whiteSpace: 'pre-wrap' }}>{entry.text}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="card stack">
          <h3>Create Ticket</h3>
          <form className="stack" onSubmit={createTicket}>
            <select
              value={ticketForm.department}
              onChange={(event) =>
                setTicketForm((prev) => ({ ...prev, department: event.target.value as 'REGISTRATION' | 'IT' }))
              }
            >
              <option value="REGISTRATION">Registration</option>
              <option value="IT">IT Support</option>
            </select>
            <input
              value={ticketForm.subject}
              onChange={(event) => setTicketForm((prev) => ({ ...prev, subject: event.target.value }))}
              placeholder="Subject"
              required
            />
            <textarea
              rows={4}
              value={ticketForm.description}
              onChange={(event) => setTicketForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Describe your issue"
              required
            />
            <input type="file" onChange={(event) => setTicketFile(event.target.files?.[0] ?? null)} />
            <button>Create Ticket</button>
          </form>
        </article>
      </section>

      <section className="card stack">
        <h3>My Tickets</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Department</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Attachments</th>
              </tr>
            </thead>
            <tbody>
              {myTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="code">{ticket.id}</td>
                  <td>{ticket.department}</td>
                  <td>{ticket.subject}</td>
                  <td>{ticket.status}</td>
                  <td>{ticket.attachments.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {me.role !== 'STUDENT' ? (
        <section className="card stack">
          <h3>Department Queue</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queueTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="code">{ticket.id}</td>
                    <td>{ticket.department}</td>
                    <td>{ticket.subject}</td>
                    <td>{ticket.status}</td>
                    <td>
                      <div className="row">
                        <button className="secondary" onClick={() => claimTicket(ticket.id)}>
                          Claim
                        </button>
                        <button className="secondary" onClick={() => setTicketStatus(ticket.id, 'IN_PROGRESS')}>
                          In Progress
                        </button>
                        <button onClick={() => setTicketStatus(ticket.id, 'RESOLVED')}>Resolve</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {me.role === 'ADMIN' ? (
        <section className="grid-2">
          <article className="card stack">
            <h3>Admin: FAQ + Documents</h3>
            <form className="stack" onSubmit={submitFaq}>
              <h4>Create FAQ</h4>
              <select
                value={faqForm.department}
                onChange={(event) =>
                  setFaqForm((prev) => ({ ...prev, department: event.target.value as 'REGISTRATION' | 'IT' }))
                }
              >
                <option value="REGISTRATION">Registration</option>
                <option value="IT">IT</option>
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
                value={docForm.department}
                onChange={(event) =>
                  setDocForm((prev) => ({ ...prev, department: event.target.value as 'REGISTRATION' | 'IT' }))
                }
              >
                <option value="REGISTRATION">Registration</option>
                <option value="IT">IT</option>
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

          <article className="card stack">
            <h3>Admin: Provision + API Keys</h3>
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
                value={provisionForm.department}
                onChange={(event) =>
                  setProvisionForm((prev) => ({ ...prev, department: event.target.value as 'REGISTRATION' | 'IT' }))
                }
              >
                <option value="REGISTRATION">Registration</option>
                <option value="IT">IT</option>
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
      ) : null}
    </div>
  );
}

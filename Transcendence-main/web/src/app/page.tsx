import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="stack">
        <section className="card stack" style={{ padding: 24 }}>
          <span className="badge">1 Orchestrator + 2 Agents</span>
          <h1>Student Support Portal</h1>
          <p>
            A chat-first support portal for Registration and IT. The assistant answers from official
            sources and escalates uncertain cases into tickets.
          </p>
          <div className="row">
            <Link href="/login">
              <button>Login</button>
            </Link>
            <Link href="/register">
              <button className="secondary">Student Registration</button>
            </Link>
          </div>
        </section>

        <section className="grid-2">
          <article className="card stack">
            <h3>Knowledge Agent</h3>
            <p>Answers policy/process questions from approved documents and FAQ.</p>
          </article>
          <article className="card stack">
            <h3>Workflow Agent</h3>
            <p>Creates support tickets and helps track ticket status.</p>
          </article>
        </section>
      </main>
    </>
  );
}

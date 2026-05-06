import { AppHeader } from '@/components/AppHeader';

export default function TermsPage() {
  return (
    <>
      <AppHeader />
      <main>
        <section className="card stack">
          <h1>Terms of Service</h1>
          <p>
            The portal is intended for students and authorized staff of the college. Users must provide
            accurate information and use the platform for legitimate support requests only.
          </p>
          <p>
            The AI assistant may refuse to answer when trusted context is missing. In that case, users can
            escalate to staff through a ticket.
          </p>
          <p>
            Abuse, impersonation, or unauthorized access attempts may lead to account suspension and
            disciplinary action.
          </p>
        </section>
      </main>
    </>
  );
}

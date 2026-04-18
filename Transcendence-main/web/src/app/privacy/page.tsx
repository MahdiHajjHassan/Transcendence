import { AppHeader } from '@/components/AppHeader';

export default function PrivacyPage() {
  return (
    <>
      <AppHeader />
      <main>
        <section className="card stack">
          <h1>Privacy Policy</h1>
          <p>
            This portal collects school ID, profile details, support requests, and assistant usage traces
            to provide student support services for Registration and IT departments.
          </p>
          <p>
            Uploaded attachments are stored with access control and are only visible to authorized users
            handling the ticket. Data is retained for operational support and evaluation purposes.
          </p>
          <p>
            Students can request data review or deletion through the Administration office.
          </p>
        </section>
      </main>
    </>
  );
}

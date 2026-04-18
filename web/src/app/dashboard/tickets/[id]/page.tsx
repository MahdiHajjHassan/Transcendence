import { AppHeader } from '@/components/AppHeader';
import { TicketDetailClient } from '@/components/TicketDetailClient';

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <AppHeader />
      <main>
        <TicketDetailClient ticketId={id} />
      </main>
    </>
  );
}

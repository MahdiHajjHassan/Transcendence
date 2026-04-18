import { AppHeader } from '@/components/AppHeader';
import { DashboardClient } from '@/components/DashboardClient';

export default function DashboardPage() {
  return (
    <>
      <AppHeader />
      <main>
        <DashboardClient />
      </main>
    </>
  );
}

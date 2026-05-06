'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken, getToken } from '@/lib/auth';

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const hasToken = typeof window !== 'undefined' && Boolean(getToken());

  const logout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <header className="topbar">
      <Link href="/" className="row" style={{ fontWeight: 700 }}>
        <span className="badge">College Support</span>
      </Link>
      <nav>
        <Link href="/privacy" className={pathname === '/privacy' ? 'badge' : ''}>
          Privacy
        </Link>
        <Link href="/terms" className={pathname === '/terms' ? 'badge' : ''}>
          Terms
        </Link>
        {hasToken ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <button className="secondary" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register" className="badge">
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

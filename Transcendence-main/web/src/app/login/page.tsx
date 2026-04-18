'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { apiRequest } from '@/lib/api';
import { saveToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await apiRequest<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ schoolId, password }),
      });
      saveToken(response.accessToken);
      router.push('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppHeader />
      <main>
        <section className="card" style={{ maxWidth: 460, margin: '0 auto' }}>
          <h2>Login</h2>
          <p className="small">Use your 8-digit school ID and password.</p>
          <form className="stack" onSubmit={submit}>
            <label className="stack">
              School ID
              <input
                value={schoolId}
                onChange={(event) => setSchoolId(event.target.value)}
                placeholder="82230428"
                maxLength={8}
                required
              />
            </label>
            <label className="stack">
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                minLength={8}
                required
              />
            </label>
            {error ? <p style={{ color: 'var(--warn)' }}>{error}</p> : null}
            <button disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
          </form>
        </section>
      </main>
    </>
  );
}

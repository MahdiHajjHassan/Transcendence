'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { apiRequest } from '@/lib/api';
import { saveToken } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiRequest<{ accessToken: string }>('/auth/register-student', {
        method: 'POST',
        body: JSON.stringify({ schoolId, password, fullName }),
      });
      saveToken(response.accessToken);
      router.push('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppHeader />
      <main>
        <section className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2>Create student account</h2>
          <p className="small">Only school ID format <span className="code">XXXXXXXX</span> is accepted.</p>
          <form className="stack" onSubmit={submit}>
            <label className="stack">
              Full name
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </label>
            <label className="stack">
              School ID
              <input
                value={schoolId}
                onChange={(event) => setSchoolId(event.target.value)}
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
            <button disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
          </form>
        </section>
      </main>
    </>
  );
}

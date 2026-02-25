export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export type ApiError = {
  message: string;
};

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers ? (init.headers as Record<string, string>) : {}),
  };

  if (!(init?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const parsed = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) {
        message = parsed.message.join(', ');
      } else if (parsed.message) {
        message = parsed.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function apiFormRequest<T>(path: string, formData: FormData): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const fallback = `Request failed (${response.status})`;
    try {
      const parsed = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) {
        throw new Error(parsed.message.join(', '));
      }
      throw new Error(parsed.message ?? fallback);
    } catch {
      throw new Error(fallback);
    }
  }

  return response.json() as Promise<T>;
}

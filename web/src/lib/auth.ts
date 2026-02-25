export type AuthPayload = {
  sub: string;
  schoolId: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  department: 'REGISTRATION' | 'IT' | null;
  exp: number;
};

export function decodeJwt(token: string): AuthPayload | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as AuthPayload;
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  localStorage.setItem('accessToken', token);
}

export function clearToken(): void {
  localStorage.removeItem('accessToken');
}

export function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

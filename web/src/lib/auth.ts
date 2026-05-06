import type {
  AcademicDepartment,
  SupportArea,
} from './routing';

export type AuthPayload = {
  sub: string;
  schoolId: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  supportArea: SupportArea | null;
  academicDepartment: AcademicDepartment | null;
  exp: number;
};

const ACCESS_TOKEN_KEY = 'accessToken';

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
  const storage = typeof window === 'undefined' ? null : window.sessionStorage;
  if (!storage) {
    return;
  }
  storage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearToken(): void {
  const storage = typeof window === 'undefined' ? null : window.sessionStorage;
  if (!storage) {
    return;
  }
  storage.removeItem(ACCESS_TOKEN_KEY);
}

export function getToken(): string | null {
  const storage = typeof window === 'undefined' ? null : window.sessionStorage;
  if (!storage) {
    return null;
  }
  return storage.getItem(ACCESS_TOKEN_KEY);
}

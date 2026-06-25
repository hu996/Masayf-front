export const AUTH_SESSION_KEY = 'masayef_auth_session';

export interface AuthSession {
  token: string;
  refreshToken?: string;
  expiresAt: string;
  fullName: string;
  email: string;
  roles: string[];
}

export function readAuthSession(): AuthSession | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null') as AuthSession | null;
    if (!session?.token || new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

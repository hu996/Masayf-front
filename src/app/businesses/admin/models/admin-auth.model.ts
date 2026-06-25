export const ADMIN_AUTH_SESSION_KEY = 'masayef_admin_session';

export interface AdminAuthSession {
  token: string;
  refreshToken?: string;
  expiresAt: string;
  fullName: string;
  userName: string;
  roles: string[];
}

export function readAdminAuthSession(): AdminAuthSession | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const session = JSON.parse(localStorage.getItem(ADMIN_AUTH_SESSION_KEY) || 'null') as AdminAuthSession | null;
    if (!session?.token || new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
    return null;
  }
}

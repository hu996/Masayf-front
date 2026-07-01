export const ADMIN_AUTH_SESSION_KEY = 'masayef_admin_session';

export interface AdminAuthSession {
  token: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt: string;
  fullName: string;
  email?: string;
  userName?: string;
  roles: string[];
  permissions?: string[];
  permissionCodes?: string[];
}

export function readAdminAuthSession(): AdminAuthSession | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const rawSession = localStorage.getItem(ADMIN_AUTH_SESSION_KEY) || 'null';
    const session = normalizeAdminSession(JSON.parse(rawSession) as Partial<AdminAuthSession> | null);
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

export function normalizeAdminSession(session: Partial<AdminAuthSession> | null | undefined): AdminAuthSession | null {
  if (!session) return null;

  const token = String(session.token ?? session.accessToken ?? '').trim();
  const expiresAt = String(session.expiresAt ?? '').trim();
  const fullName = String(session.fullName ?? '').trim();

  if (!token || !expiresAt) {
    return null;
  }

  return {
    token,
    accessToken: session.accessToken ?? token,
    refreshToken: session.refreshToken,
    expiresAt,
    fullName,
    email: session.email,
    userName: session.userName,
    roles: Array.isArray(session.roles) ? session.roles : [],
    permissions: Array.isArray(session.permissions) ? session.permissions : undefined,
    permissionCodes: Array.isArray(session.permissionCodes) ? session.permissionCodes : undefined
  };
}

export const ADMIN_AUTH_SESSION_KEY = 'masayef_admin_session';

export interface AdminAuthSession {
  token: string;
  refreshToken?: string;
  expiresAt: string;
  fullName: string;
  userName: string;
  roles: string[];
}


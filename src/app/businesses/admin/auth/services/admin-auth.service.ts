import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { ADMIN_AUTH_SESSION_KEY, AdminAuthSession, normalizeAdminSession } from '../models/admin-auth.model';

interface AdminAuthResponse extends Partial<AdminAuthSession> {
  accessToken?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly api = inject(ApiService);

  readonly session = signal<AdminAuthSession | null>(this.readSession());
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly isAuthenticated = computed(() => Boolean(this.session()));

  login(userName: string, password: string): Observable<boolean> {
    this.loading.set(true);
    this.errorMessage.set('');

    return this.api.post<AdminAuthResponse>('/Admin/Auth/Login', { userName, password }).pipe(
      tap((session) => this.finish(session)),
      map(() => true),
      catchError((error: unknown) => {
        this.errorMessage.set(this.mapError(error));
        return of(false);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
    }
    this.session.set(null);
  }

  hasAnyRole(...roles: string[]): boolean {
    const current = (this.session()?.roles ?? []).map((role) => role.toLowerCase());
    return roles.some((role) => current.includes(role.toLowerCase()));
  }

  private finish(session: AdminAuthResponse): void {
    const normalized = normalizeAdminSession(session);
    if (!normalized) {
      throw new Error('تعذر حفظ جلسة الأدمن.');
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ADMIN_AUTH_SESSION_KEY, JSON.stringify(normalized));
    }
    this.session.set(normalized);
  }

  private readSession(): AdminAuthSession | null {
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

  private mapError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'تعذر الاتصال بالخادم.';
      if (error.status === 401) return 'بيانات الدخول غير صحيحة.';
      if (error.status === 403) return 'هذا الحساب غير مصرّح له بالدخول.';

      const body = error.error as { message?: string; errors?: string[] } | string | null;
      const message = typeof body === 'string' ? body : body?.message || body?.errors?.join(' - ');
      if (message) {
        const normalized = message.toLowerCase();
        if (normalized.includes('inactive') || normalized.includes('disabled') || normalized.includes('not active')) {
          return 'هذا الحساب غير نشط حاليًا.';
        }
        if (normalized.includes('admin') && (normalized.includes('not allowed') || normalized.includes('not authorized'))) {
          return 'هذا الحساب غير مسموح له بالدخول إلى لوحة الإدارة.';
        }
        return message;
      }

      return 'تعذر تسجيل الدخول.';
    }

    return error instanceof Error ? error.message : 'تعذر تسجيل الدخول.';
  }
}

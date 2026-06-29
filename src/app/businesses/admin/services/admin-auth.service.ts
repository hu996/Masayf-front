import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { ADMIN_AUTH_SESSION_KEY, AdminAuthSession } from '../models/admin-auth.model';

interface AdminAuthResponse extends AdminAuthSession {}

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

  private finish(session: AdminAuthSession): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ADMIN_AUTH_SESSION_KEY, JSON.stringify(session));
    }
    this.session.set(session);
  }

  private readSession(): AdminAuthSession | null {
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

  private mapError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'تعذر الاتصال بالخادم.';
      if (error.status === 401) return 'بيانات الدخول غير صحيحة.';
      if (error.status === 403) return 'هذا الحساب غير مصرح له بالدخول.';

      const body = error.error as { message?: string; errors?: string[] } | string | null;
      const message = typeof body === 'string' ? body : body?.message || body?.errors?.join(' - ');
      return message || 'تعذر تسجيل الدخول.';
    }

    return error instanceof Error ? error.message : 'تعذر تسجيل الدخول.';
  }
}

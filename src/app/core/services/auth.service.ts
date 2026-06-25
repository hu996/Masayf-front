import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';
import { AUTH_SESSION_KEY, AuthSession, readAuthSession } from '../auth/auth-session';
import { ApiService } from './api.service';

interface AuthResponse extends AuthSession {}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private pendingAction: (() => void) | null = null;

  readonly session = signal<AuthSession | null>(readAuthSession());
  readonly loginOpen = signal(false);
  readonly loginReason = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly tripsCount = signal(0);
  readonly isAuthenticated = computed(() => Boolean(this.session()));
  readonly isAdmin = computed(() => this.hasAnyRole('Admin', 'Moderator'));

  constructor() {
    if (this.session()) this.refreshTripsCount();
  }

  requireLogin(reason: string, action: () => void): void {
    if (this.isAuthenticated()) {
      action();
      return;
    }

    this.pendingAction = action;
    this.loginReason.set(reason);
    this.errorMessage.set('');
    this.loginOpen.set(true);
  }

  closeLogin(): void {
    this.loginOpen.set(false);
    this.pendingAction = null;
    this.errorMessage.set('');
  }

  socialLogin(provider: 'google' | 'facebook', token: string): void {
    if (provider === 'google') {
      this.googleLogin(token);
      return;
    }

    this.authenticate('/Auth/SocialLogin', { provider, token }, 'تعذر تسجيل الدخول عبر فيسبوك. تأكد من الإعدادات ثم حاول مرة أخرى.');
  }

  googleLogin(idToken: string): void {
    this.authenticate('/Auth/GoogleLogin', { idToken }, 'تعذر تسجيل الدخول بجوجل. تأكد من التوكن ثم حاول مرة أخرى.');
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(AUTH_SESSION_KEY);
    this.session.set(null);
    this.tripsCount.set(0);
  }

  hasAnyRole(...roles: string[]): boolean {
    const current = (this.session()?.roles ?? []).map((role) => role.toLowerCase());
    return roles.some((role) => current.includes(role.toLowerCase()));
  }

  refreshTripsCount(): void {
    if (!this.isAuthenticated()) return;
    this.api.get<unknown[]>('/TripExperiences/My').pipe(
      catchError(() => of([]))
    ).subscribe((items) => this.tripsCount.set(Array.isArray(items) ? items.length : 0));
  }

  private authenticate(path: string, body: unknown, fallbackMessage: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.api.post<AuthResponse>(path, body).pipe(
      tap((session) => this.finishLogin(session)),
      catchError((error: unknown) => {
        this.errorMessage.set(this.mapLoginError(error, fallbackMessage));
        return of(null);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe();
  }

  private finishLogin(session: AuthResponse): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    }
    this.session.set(session);
    this.loginOpen.set(false);
    this.refreshTripsCount();

    const action = this.pendingAction;
    this.pendingAction = null;
    action?.();
  }

  private mapLoginError(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'تعذر الاتصال بالخادم. تأكد من تشغيل السيرفر ثم حاول مرة أخرى.';
      }

      const body = error.error as { message?: string; errors?: string[] | Record<string, string[]> } | string | null;
      const message = typeof body === 'string'
        ? body
        : body?.message || this.flattenErrors(body?.errors);

      if (error.status === 401 || error.status === 403) {
        if (this.looksLikeInactiveAccount(message)) {
          return 'حسابك غير مفعل حالياً. تواصل مع الدعم أو جرّب حساباً آخر.';
        }
        return message || 'تعذر تسجيل الدخول. التوكن مرفوض أو غير صالح.';
      }

      return message || fallbackMessage;
    }

    const message = error instanceof Error ? error.message : '';

    if (this.looksLikeInactiveAccount(message)) {
      return 'حسابك غير مفعل حالياً. تواصل مع الدعم أو جرّب حساباً آخر.';
    }

    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('failed to fetch')) {
      return 'تعذر الاتصال بالخادم. تأكد من الإنترنت ثم حاول مرة أخرى.';
    }

    return message || fallbackMessage;
  }

  private flattenErrors(errors?: string[] | Record<string, string[]>): string {
    if (!errors) return '';
    return Array.isArray(errors) ? errors.join(' - ') : Object.values(errors).flat().join(' - ');
  }

  private looksLikeInactiveAccount(message: string): boolean {
    const text = message.toLowerCase();
    return text.includes('inactive') || text.includes('disabled') || text.includes('غير مفعل') || text.includes('موقوف');
  }
}

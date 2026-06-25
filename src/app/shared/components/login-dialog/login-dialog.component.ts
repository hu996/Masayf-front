import { AfterViewChecked, ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback: (result: { credential?: string }) => void }): void;
          renderButton(element: HTMLElement, options: Record<string, unknown>): void;
        };
      };
    };
    FB?: {
      init(options: { appId: string; cookie: boolean; xfbml: boolean; version: string }): void;
      login(callback: (response: { authResponse?: { accessToken: string } }) => void, options: { scope: string }): void;
    };
  }
}

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-dialog.component.html',
  styleUrl: './login-dialog.component.scss'
})
export class LoginDialogComponent implements AfterViewChecked {
  readonly auth = inject(AuthService);
  readonly googleLoading = signal(false);
  private readonly googleButton = viewChild<ElementRef<HTMLDivElement>>('googleButton');
  private googleRendered = false;

  ngAfterViewChecked(): void {
    if (!this.auth.loginOpen()) {
      this.googleRendered = false;
      this.googleLoading.set(false);
      return;
    }

    if (!this.googleRendered && this.googleButton()) {
      void this.renderGoogleButton();
    }
  }

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.auth.closeLogin();
  }

  loginWithFacebook(): void {
    if (!environment.facebookAppId) {
      this.auth.errorMessage.set('أضف Facebook App ID في ملف البيئة لتفعيل تسجيل الدخول بفيسبوك.');
      return;
    }

    this.loadScript('facebook-jssdk', 'https://connect.facebook.net/ar_AR/sdk.js').then(() => {
      window.FB?.init({ appId: environment.facebookAppId, cookie: true, xfbml: false, version: 'v22.0' });
      window.FB?.login((response) => {
        const token = response.authResponse?.accessToken;
        if (token) {
          this.auth.socialLogin('facebook', token);
          return;
        }
        this.auth.errorMessage.set('تعذر الحصول على توكن فيسبوك. حاول مرة أخرى.');
      }, { scope: 'public_profile,email' });
    }).catch(() => this.auth.errorMessage.set('تعذر تحميل تسجيل الدخول بفيسبوك.'));
  }

  private async renderGoogleButton(): Promise<void> {
    this.googleLoading.set(true);
    let rendered = false;

    if (!environment.googleClientId) {
      this.auth.errorMessage.set('أضف Google Client ID في ملف البيئة لتفعيل تسجيل الدخول بجوجل.');
      this.googleLoading.set(false);
      this.googleRendered = false;
      return;
    }

    try {
      await this.loadScript('google-identity', 'https://accounts.google.com/gsi/client');
      const element = this.googleButton()?.nativeElement;

      if (!element || !window.google) {
        this.auth.errorMessage.set('تعذر تجهيز تسجيل الدخول بجوجل.');
        this.googleRendered = false;
        return;
      }

      window.google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: ({ credential }) => {
          if (!credential) {
            this.auth.errorMessage.set('تعذر الحصول على بيانات تسجيل الدخول من جوجل.');
            return;
          }

          this.auth.googleLogin(credential);
        }
      });

      window.google.accounts.id.renderButton(element, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        locale: 'ar',
        width: element.clientWidth || 360
      });
      rendered = true;
    } catch {
      this.auth.errorMessage.set('تعذر تحميل تسجيل الدخول بجوجل.');
    } finally {
      this.googleRendered = rendered;
      this.googleLoading.set(false);
    }
  }

  private loadScript(id: string, src: string): Promise<void> {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset['loaded'] === 'true') return Promise.resolve();
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Unable to load ${id}`)), { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        script.dataset['loaded'] = 'true';
        resolve();
      };
      script.onerror = () => reject(new Error(`Unable to load ${id}`));
      document.head.appendChild(script);
    });
  }
}

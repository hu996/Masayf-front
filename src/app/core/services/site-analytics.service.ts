import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { AnalyticsService } from './analytics.service';
import { TrackPageViewRequest } from '../models/analytics.model';

const VISITOR_KEY_STORAGE = 'masayef:visitor-key';

@Injectable({ providedIn: 'root' })
export class SiteAnalyticsService {
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly platformId = inject(PLATFORM_ID);
  private initialized = false;
  private lastTrackedPath = '';

  init(): void {
    if (this.initialized || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initialized = true;

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.track(event.urlAfterRedirects);
      });

    queueMicrotask(() => this.track(this.router.url));
  }

  private track(url: string): void {
    if (!url || url.startsWith('/admin')) {
      return;
    }

    const path = url.split('?')[0] || '/';
    if (this.lastTrackedPath === path) {
      return;
    }

    this.lastTrackedPath = path;

    const payload: TrackPageViewRequest = {
      pageKey: this.pageKey(path),
      pageTitle: this.pageTitle(path),
      path,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      visitorKey: this.getVisitorKey()
    };

    this.analytics.trackPageView(payload).subscribe({
      next: (response) => {
        if (response.visitorKey) {
          this.writeStorageValue(VISITOR_KEY_STORAGE, response.visitorKey);
        }
      },
      error: () => {
        // Tracking should never break the public site UX.
      }
    });
  }

  private pageKey(path: string): string {
    if (path === '/' || path === '/home') return 'home';
    return path.replace(/^\/+/, '').replace(/[\/?#].*$/, '').replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'home';
  }

  private pageTitle(path: string): string {
    const map: Record<string, string> = {
      '/': 'الرئيسية',
      '/home': 'الرئيسية',
      '/go-where': 'أين تذهب',
      '/cities': 'المدن',
      '/accommodations': 'الإقامات',
      '/attractions': 'الأنشطة',
      '/trip-planner': 'مخطط الرحلة',
      '/experiences': 'التجارب',
      '/share-experience': 'شارك تجربتك',
      '/favorites': 'المفضلة',
      '/support': 'الدعم والشكاوى'
    };

    return map[path] || 'Masayef';
  }

  private getVisitorKey(): string {
    const stored = this.readStorageValue(VISITOR_KEY_STORAGE);
    if (stored) {
      return stored;
    }

    const key = this.createVisitorKey();
    this.writeStorageValue(VISITOR_KEY_STORAGE, key);
    return key;
  }

  private createVisitorKey(): string {
    return `visitor_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  }

  private readStorageValue(key: string): string {
    if (typeof localStorage === 'undefined') {
      return '';
    }

    return localStorage.getItem(key) || '';
  }

  private writeStorageValue(key: string, value: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, value);
  }
}

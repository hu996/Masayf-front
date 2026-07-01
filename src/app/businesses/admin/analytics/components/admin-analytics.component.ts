import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { AnalyticsService } from '@app/core/services/analytics.service';
import {
  AdminAnalyticsOverview,
  AdminDailyTraffic,
  AdminPageViewRow,
  AdminPageViewsResult,
  AdminTopPage
} from '@app/core/models/analytics.model';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-analytics.component.html',
  styleUrl: './admin-analytics.component.scss'
})
export class AdminAnalyticsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly analytics = inject(AnalyticsService);

  readonly overview = signal<AdminAnalyticsOverview | null>(null);
  readonly pageViews = signal<AdminPageViewsResult | null>(null);
  readonly loadingOverview = signal(true);
  readonly loadingPageViews = signal(true);
  readonly overviewError = signal('');
  readonly pageViewsError = signal('');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(12);

  readonly filtersForm = this.fb.nonNullable.group({
    search: [''],
    fromDate: [''],
    toDate: ['']
  });

  readonly totalPages = signal(1);

  ngOnInit(): void {
    this.loadOverview();
    this.loadPageViews();
  }

  refresh(): void {
    this.loadOverview();
    this.loadPageViews();
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadOverview();
    this.loadPageViews();
  }

  resetFilters(): void {
    this.filtersForm.reset({ search: '', fromDate: '', toDate: '' });
    this.pageNumber.set(1);
    this.refresh();
  }

  setPage(page: number): void {
    const next = Math.min(Math.max(page, 1), this.totalPages());
    if (next === this.pageNumber()) {
      return;
    }

    this.pageNumber.set(next);
    this.loadPageViews();
  }

  cards(): Array<{ label: string; value: number; tone: string; hint: string }> {
    const overview = this.overview();
    return [
      {
        label: 'إجمالي المشاهدات',
        value: overview?.totalPageViews ?? 0,
        tone: 'primary',
        hint: 'كل زيارات الصفحات'
      },
      {
        label: 'إجمالي الزوار',
        value: overview?.uniqueVisitors ?? 0,
        tone: 'secondary',
        hint: 'الزوار الفريدين'
      },
      {
        label: 'مشاهدات اليوم',
        value: overview?.todayPageViews ?? 0,
        tone: 'accent',
        hint: 'آخر 24 ساعة'
      },
      {
        label: 'زوار اليوم',
        value: overview?.todayUniqueVisitors ?? 0,
        tone: 'success',
        hint: 'الزوار الفريدين اليوم'
      }
    ];
  }

  topPages(): AdminTopPage[] {
    return this.overview()?.topPages ?? [];
  }

  dailyTraffic(): AdminDailyTraffic[] {
    return this.overview()?.dailyTraffic ?? [];
  }

  pageViewRows(): AdminPageViewRow[] {
    return this.pageViews()?.items ?? [];
  }

  maxTraffic(): number {
    return Math.max(...this.dailyTraffic().map((item) => item.pageViews), 1);
  }

  maxTopPages(): number {
    return Math.max(...this.topPages().map((item) => item.views), 1);
  }

  formatDay(day: string): string {
    const date = new Date(day);
    if (Number.isNaN(date.getTime())) {
      return day;
    }

    return new Intl.DateTimeFormat('ar-EG', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  friendlyOverviewError(): string {
    return this.overviewError() || 'لم نتمكن من تحميل التحليلات الآن.';
  }

  friendlyPageViewsError(): string {
    return this.pageViewsError() || 'لم نتمكن من تحميل سجل الزيارات الآن.';
  }

  trackByPage(_: number, item: AdminTopPage): string {
    return item.pageKey;
  }

  trackByTraffic(_: number, item: AdminDailyTraffic): string {
    return item.day;
  }

  trackByView(_: number, item: AdminPageViewRow): string {
    return String(item.id);
  }

  private loadOverview(): void {
    this.loadingOverview.set(true);
    this.overviewError.set('');

    const { fromDate, toDate } = this.filtersForm.getRawValue();
    this.analytics.getOverview(fromDate || null, toDate || null).pipe(
      catchError((error: unknown) => {
        this.overview.set(null);
        this.overviewError.set(this.resolveErrorMessage(error, 'تعذر تحميل تحليلات الزوار.'));
        return of(null);
      }),
      finalize(() => this.loadingOverview.set(false))
    ).subscribe((overview) => {
      if (overview) {
        this.overview.set(overview);
      }
    });
  }

  private loadPageViews(): void {
    this.loadingPageViews.set(true);
    this.pageViewsError.set('');

    const { search, fromDate, toDate } = this.filtersForm.getRawValue();
    const pageNumber = this.pageNumber();
    const pageSize = this.pageSize();

    this.analytics.getPageViews({
      search: search.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      pageNumber,
      pageSize
    }).pipe(
      catchError((error: unknown) => {
        this.pageViews.set(null);
        this.pageViewsError.set(this.resolveErrorMessage(error, 'تعذر تحميل سجل الزيارات.'));
        this.totalPages.set(1);
        return of(null);
      }),
      finalize(() => this.loadingPageViews.set(false))
    ).subscribe((result) => {
      if (!result) {
        return;
      }

      this.pageViews.set(result);
      this.totalPages.set(Math.max(1, Math.ceil((result.totalCount || result.items.length || 0) / result.pageSize)));
      this.pageNumber.set(Math.min(this.pageNumber(), this.totalPages()));
    });
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object') {
      const status = Number((error as { status?: unknown }).status ?? 0);

      if (status === 503) {
        return 'خدمة التحليلات غير متاحة الآن. يبدو أن قاعدة البيانات أو الـ API متوقفة مؤقتًا.';
      }

      if (status === 0) {
        return 'تعذر الاتصال بالخادم. تأكد أن الـ backend يعمل وأن الشهادة/البروكسي مضبوطان.';
      }
    }

    return error instanceof Error && error.message ? error.message : fallback;
  }
}

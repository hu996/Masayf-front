import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AdminDashboardOverview, DashboardStatCard, PendingExperienceRow, TrendPoint } from '../models/admin-dashboard.model';
import { AdminDashboardService } from '../services/admin-dashboard.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly service = inject(AdminDashboardService);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly overview = signal<AdminDashboardOverview | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.service.getOverview().pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تحميل لوحة التحكم الآن.');
        return of(null);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((overview) => this.overview.set(overview));
  }

  kpis(): DashboardStatCard[] {
    const overview = this.overview();
    return [
      { label: 'المستخدمون النشطون', value: overview?.activeUsers ?? 0 },
      { label: 'مستخدمون جدد هذا الأسبوع', value: overview?.newUsersThisWeek ?? 0 },
      { label: 'مستخدمون جدد هذا الشهر', value: overview?.newUsersThisMonth ?? 0 },
      { label: 'المدن', value: overview?.citiesCount ?? 0 },
      { label: 'المحافظات', value: overview?.governoratesCount ?? 0 },
      { label: 'القوائم المرجعية', value: overview?.lookupTypesCount ?? 0 },
      { label: 'عناصر القوائم المرجعية', value: overview?.lookupItemsCount ?? 0 },
      { label: 'إجمالي التجارب', value: overview?.totalExperiencesCount ?? 0 },
      { label: 'التجارب المسودة', value: overview?.draftExperiencesCount ?? 0 },
      { label: 'التجارب المعلقة', value: overview?.pendingExperiencesCount ?? 0 },
      { label: 'التجارب قيد المراجعة', value: overview?.pendingReviewExperiencesCount ?? 0 },
      { label: 'التجارب المنشورة', value: overview?.publishedExperiencesCount ?? 0 },
      { label: 'التجارب المرفوضة', value: overview?.rejectedExperiencesCount ?? 0 },
      { label: 'التجارب المعلّمة', value: overview?.flaggedExperiencesCount ?? 0 },
      { label: 'إجمالي الأماكن', value: overview?.totalPlacesCount ?? 0 },
      { label: 'الأماكن المعلقة', value: overview?.pendingPlacesCount ?? 0 },
      { label: 'الأماكن المعتمدة', value: overview?.approvedPlacesCount ?? 0 },
      { label: 'خطط الرحلات', value: overview?.tripPlansCount ?? 0 },
      { label: 'خطط هذا الأسبوع', value: overview?.tripPlansThisWeek ?? 0 },
      { label: 'خطط هذا الشهر', value: overview?.tripPlansThisMonth ?? 0 },
      { label: 'تجارب هذا الأسبوع', value: overview?.tripExperiencesThisWeek ?? 0 },
      { label: 'تجارب هذا الشهر', value: overview?.tripExperiencesThisMonth ?? 0 },
      { label: 'أماكن أضيفت هذا الأسبوع', value: overview?.placesAddedThisWeek ?? 0 },
      { label: 'أماكن أضيفت هذا الشهر', value: overview?.placesAddedThisMonth ?? 0 }
    ];
  }

  topCities(): TrendPoint[] {
    return (this.overview()?.topCities ?? []).map((item) => ({ label: item.cityName, value: item.count }));
  }

  experienceTrends(): TrendPoint[] {
    return this.overview()?.experienceTrends ?? [];
  }

  tripPlanTrends(): TrendPoint[] {
    return this.overview()?.tripPlanTrends ?? [];
  }

  pendingExperiences(): PendingExperienceRow[] {
    return this.overview()?.recentPendingExperiences ?? [];
  }

  maxValue(items: TrendPoint[]): number {
    return Math.max(...items.map((item) => item.value), 1);
  }

  statusLabel(status?: string | number | null): string {
    const value = String(status ?? '').toLowerCase();
    if (!value) return 'معلّق';
    if (value.includes('pendingreview')) return 'قيد المراجعة';
    if (value.includes('pending')) return 'معلّق';
    if (value.includes('published') || value.includes('approved')) return 'منشور';
    if (value.includes('rejected')) return 'مرفوض';
    if (value.includes('flagged')) return 'معلّم';
    return String(status);
  }
}

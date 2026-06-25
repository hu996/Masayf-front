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
      { label: 'Active users', value: overview?.activeUsers ?? 0 },
      { label: 'Cities', value: overview?.citiesCount ?? 0 },
      { label: 'Governorates', value: overview?.governoratesCount ?? 0 },
      { label: 'Lookup types', value: overview?.lookupTypesCount ?? 0 },
      { label: 'Lookup items', value: overview?.lookupItemsCount ?? 0 },
      { label: 'Pending experiences', value: overview?.pendingExperiencesCount ?? 0 },
      { label: 'Published experiences', value: overview?.publishedExperiencesCount ?? 0 },
      { label: 'Pending places', value: overview?.pendingPlacesCount ?? 0 },
      { label: 'Approved places', value: overview?.approvedPlacesCount ?? 0 },
      { label: 'Trip plans', value: overview?.tripPlansCount ?? 0 }
    ];
  }

  weeklyMonthlyCards(): DashboardStatCard[] {
    const overview = this.overview();
    return [
      { label: 'Experiences this week', value: overview?.tripExperiencesThisWeek ?? 0 },
      { label: 'Experiences this month', value: overview?.tripExperiencesThisMonth ?? 0 },
      { label: 'Trip plans this week', value: overview?.tripPlansThisWeek ?? 0 },
      { label: 'Trip plans this month', value: overview?.tripPlansThisMonth ?? 0 },
      { label: 'Places added this week', value: overview?.placesAddedThisWeek ?? 0 },
      { label: 'Places added this month', value: overview?.placesAddedThisMonth ?? 0 }
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
}

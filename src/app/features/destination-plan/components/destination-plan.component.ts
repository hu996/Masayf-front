import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CityBudgetResult, normalizeId } from '@app/core/models/api.models';
import { SavedDestinationsService } from '../../go-where/services/saved-destinations.service';
import { ActivityCustomizerComponent, CustomizableActivity } from '@app/shared/components/activity-customizer/activity-customizer.component';
import { ActivityTimelineComponent, ActivityTimelineItem } from '@app/shared/components/activity-timeline/activity-timeline.component';
import { BudgetStatusBadgeComponent } from '@app/shared/components/budget-status-badge/budget-status-badge.component';
import { CityBudgetCardComponent } from '@app/shared/components/city-budget-card/city-budget-card.component';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';
import { PricePipe } from '@app/shared/pipes/price.pipe';

@Component({
  selector: 'app-destination-plan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EmptyStateComponent, PricePipe, BudgetStatusBadgeComponent, ActivityTimelineComponent, ActivityCustomizerComponent, CityBudgetCardComponent],
  templateUrl: './destination-plan.component.html',
  styleUrl: './destination-plan.component.scss'
})
export class DestinationPlanComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly savedDestinations = inject(SavedDestinationsService);

  readonly destination = signal<CityBudgetResult | null>(null);
  readonly activities = signal<CustomizableActivity[]>([]);
  readonly errorMessage = signal('');

  readonly activeActivitiesTotal = computed(() => this.activities().filter((activity) => activity.active).reduce((total, activity) => total + activity.cost, 0));
  readonly originalTotal = computed(() => this.destination()?.totalCost ?? 0);
  readonly adjustedTotal = computed(() => {
    const destination = this.destination();
    if (!destination) {
      return 0;
    }

    return destination.totalCost - destination.attractionsCost + this.activeActivitiesTotal();
  });
  readonly adjustedRemaining = computed(() => {
    const destination = this.destination();
    if (!destination) {
      return 0;
    }

    return destination.totalCost + destination.remainingBudget - this.adjustedTotal();
  });
  readonly activityDifference = computed(() => this.adjustedTotal() - this.originalTotal());
  readonly timelineItems = computed<ActivityTimelineItem[]>(() => this.buildTimeline(this.destination(), this.activities()));

  ngOnInit(): void {
    const destinationId = normalizeId(this.route.snapshot.paramMap.get('destinationId'));
    const stateDestination = history.state?.destination as CityBudgetResult | undefined;

    if (stateDestination?.cityName) {
      this.setDestination(stateDestination);
      return;
    }

    this.savedDestinations.load().pipe(catchError(() => of([]))).subscribe(() => {
      const savedDestination = this.findSavedDestination(destinationId);
      if (!savedDestination) {
        this.errorMessage.set('لم نتمكن من تحميل خطة الوجهة. ارجع لنتائج البحث واختر وجهة لعرض خطتها.');
        return;
      }
      this.setDestination(savedDestination);
    });
  }

  toggleActivity(index: number): void {
    this.activities.update((activities) => activities.map((activity, itemIndex) => itemIndex === index ? { ...activity, active: !activity.active } : activity));
  }

  budgetTotal(destination: CityBudgetResult): number {
    return destination.totalCost + destination.remainingBudget;
  }

  days(): number[] {
    const count = this.safeQueryNumber('daysCount', 3);
    return Array.from({ length: Math.min(Math.max(count, 1), 10) }, (_, index) => index + 1);
  }

  costPercent(value: number): number {
    const total = this.adjustedTotal();
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  accommodationName(destination: CityBudgetResult): string {
    return destination.cheapestAccommodationName || 'سيظهر اسم الإقامة عند توفره من الخادم';
  }

  accommodationPrice(destination: CityBudgetResult): number {
    return Number(destination.cheapestAccommodationPrice ?? destination.accommodationCost ?? 0);
  }

  private findSavedDestination(destinationId: string | null): CityBudgetResult | null {
    if (!destinationId) {
      return null;
    }

    try {
      const saved = this.savedDestinations.getAll();
      const item = saved.find((destination) => normalizeId(destination.cityId) === destinationId || destination.cityName === destinationId);
      return item ? this.savedToCityBudgetResult(item) : null;
    } catch {
      return null;
    }
  }

  private normalizeDestination(destination: CityBudgetResult): CityBudgetResult {
    return {
      ...destination,
      cityName: destination.cityName || 'وجهة غير محددة',
      totalCost: Number(destination.totalCost ?? 0),
      remainingBudget: Number(destination.remainingBudget ?? 0),
      accommodationCost: Number(destination.accommodationCost ?? 0),
      foodCost: Number(destination.foodCost ?? 0),
      transportationCost: Number(destination.transportationCost ?? 0),
      attractionsCost: Number(destination.attractionsCost ?? 0),
      experiencesCount: Number(destination.experiencesCount ?? 0),
      bestActivities: destination.bestActivities ?? []
    };
  }

  private savedToCityBudgetResult(destination: ReturnType<SavedDestinationsService['getAll']>[number]): CityBudgetResult {
    return {
      cityId: destination.cityId,
      cityName: destination.cityName,
      imageUrl: destination.imageUrl,
      fitScore: 0,
      isWithinBudget: true,
      estimatedTotalCost: destination.totalCost,
      costBreakdown: { accommodation: 0, transportation: 0, food: 0, activities: 0, other: 0 },
      recommendedAccommodation: null,
      recommendedActivities: [],
      experienceCount: 0,
      averageRating: 0,
      badges: [],
      summary: '',
      totalCost: destination.totalCost,
      remainingBudget: destination.remainingBudget,
      accommodationCost: 0,
      foodCost: 0,
      transportationCost: 0,
      attractionsCost: 0,
      experiencesCount: 0,
      matchPercent: 0,
      bestActivities: []
    };
  }

  private setDestination(destination: CityBudgetResult): void {
    const normalized = this.normalizeDestination(destination);
    this.destination.set(normalized);
    this.activities.set(this.buildActivities(normalized));
  }

  private buildActivities(destination: CityBudgetResult): CustomizableActivity[] {
    const names = destination.bestActivities ?? [];
    if (!names.length) {
      return [];
    }

    const itemCost = Math.round((Number(destination.attractionsCost ?? 0) / names.length) || 0);
    return names.map((name) => ({ name, cost: itemCost, active: true }));
  }

  private buildTimeline(destination: CityBudgetResult | null, activities: CustomizableActivity[]): ActivityTimelineItem[] {
    if (!destination) {
      return [];
    }

    const activeActivities = activities.filter((activity) => activity.active);
    return this.days().map((day, index) => {
      const activity = activeActivities[index % Math.max(activeActivities.length, 1)];

      return {
        day,
        title: activity?.name || (day === 1 ? 'وصول واستكشاف المدينة' : 'يوم مفتوح حسب المتاح'),
        place: destination.cityName,
        cost: activity?.cost,
        duration: activity ? '2 - 4 ساعات' : 'حسب الخطة',
        notes: day === this.days().length ? 'اترك وقت للعودة ومراجعة المصاريف النهائية.' : 'راجع التوفر والأسعار قبل الاعتماد النهائي.'
      };
    });
  }

  private safeQueryNumber(key: string, fallback: number): number {
    const value = Number(this.route.snapshot.queryParamMap.get(key));
    return Number.isNaN(value) || value <= 0 ? fallback : value;
  }
}

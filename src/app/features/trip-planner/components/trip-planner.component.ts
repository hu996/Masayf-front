import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { ActivityAlternative, City, LookupGroup, TripScenarioItem, normalizeId } from '@app/core/models/api.models';
import { TripPlannerRequest, TripPlanResponse, TripScenario } from '../models/trip-planner.model';
import { CitiesService } from '../../cities/services/cities.service';
import { LookupsService } from '../../lookups/services/lookups.service';
import { SavedTripPlansService } from '../../my-plans/services/saved-trip-plans.service';
import { AuthService } from '@app/core/services/auth.service';
import { ToastService } from '@app/core/services/toast.service';
import { TripPlannerService } from '../services/trip-planner.service';
import { CostBreakdownCardComponent } from '@app/shared/components/cost-breakdown-card/cost-breakdown-card.component';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';
import { PriceSummaryCardComponent } from '@app/shared/components/price-summary-card/price-summary-card.component';
import { PricePipe } from '@app/shared/pipes/price.pipe';

interface ReplacementTarget {
  scenarioType: string;
  item: TripScenarioItem;
}

@Component({
  selector: 'app-trip-planner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, EmptyStateComponent, PricePipe, PriceSummaryCardComponent, CostBreakdownCardComponent],
  templateUrl: './trip-planner.component.html',
  styleUrl: './trip-planner.component.scss'
})
export class TripPlannerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly planner = inject(TripPlannerService);
  private readonly citiesService = inject(CitiesService);
  private readonly lookups = inject(LookupsService);
  private readonly savedPlans = inject(SavedTripPlansService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly cities = signal<City[]>([]);
  readonly governorates = signal<Array<{ id: string | number; name: string }>>([]);
  readonly activityCategories = signal<LookupGroup['items']>([]);
  readonly plan = signal<TripPlanResponse | null>(null);
  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly formError = signal('');
  readonly active = signal<TripScenario['scenarioType']>('Economic');
  readonly replacementTarget = signal<ReplacementTarget | null>(null);
  readonly alternatives = signal<ActivityAlternative[]>([]);
  readonly loadingAlternatives = signal(false);
  readonly recalculatedPlan = computed(() => this.plan());

  readonly form = this.fb.nonNullable.group({
    cityId: this.fb.control<string | null>(null, Validators.required),
    budget: [8000, [Validators.required, Validators.min(1)]],
    daysCount: [3, [Validators.required, Validators.min(1)]],
    personsCount: [2, [Validators.required, Validators.min(1)]],
    tripType: [1, Validators.required],
    preferredAccommodationType: [1],
    preferredTransportType: [1],
    fromGovernorateId: [''],
    interestCodes: this.fb.nonNullable.control<string[]>([])
  });

  readonly tripTypes = signal([
    { value: 1, code: 'Family', label: 'عائلية' },
    { value: 2, code: 'Friends', label: 'أصدقاء' },
    { value: 3, code: 'Adventure', label: 'مغامرة' },
    { value: 4, code: 'Romantic', label: 'رومانسية' },
    { value: 5, code: 'Youth', label: 'شبابية' },
    { value: 6, code: 'Relaxation', label: 'استرخاء' },
    { value: 7, code: 'Budget', label: 'اقتصادية' },
    { value: 8, code: 'Luxury', label: 'فاخرة' }
  ]);

  readonly accommodationTypes = signal([
    { value: 1, code: 'Hotel', label: 'فندق' },
    { value: 2, code: 'Chalet', label: 'شاليه' },
    { value: 3, code: 'Apartment', label: 'شقة' },
    { value: 4, code: 'Villa', label: 'فيلا' },
    { value: 5, code: 'Hostel', label: 'هوستل' },
    { value: 6, code: 'Resort', label: 'منتجع' },
    { value: 7, code: 'Camp', label: 'مخيم' }
  ]);

  readonly transportTypes = signal([
    { value: 1, code: 'Car', label: 'سيارة' },
    { value: 2, code: 'Bus', label: 'أتوبيس' },
    { value: 3, code: 'Train', label: 'قطار' },
    { value: 4, code: 'Boat', label: 'مركب' },
    { value: 5, code: 'Plane', label: 'طائرة' },
    { value: 6, code: 'PrivateTransportation', label: 'مواصلات خاصة' }
  ]);

  ngOnInit(): void {
    this.citiesService.getCities().pipe(catchError(() => of([]))).subscribe((result) => {
      this.cities.set(Array.isArray(result) ? result : result.items ?? []);
    });
    this.citiesService.getGovernorates().pipe(catchError(() => of([]))).subscribe((items) => {
      this.governorates.set(items.map((item) => ({ id: item.id, name: item.name })));
    });
    this.lookups.getAll().pipe(catchError(() => of([]))).subscribe((groups) => {
      this.applyLookup(groups, 'TripType', this.tripTypes);
      this.applyLookup(groups, 'AccommodationType', this.accommodationTypes);
      this.applyLookup(groups, 'TransportType', this.transportTypes);
      this.activityCategories.set(groups.find((item) => item.typeCode === 'ActivityCategory')?.items ?? []);
    });

    const cityId = normalizeId(this.route.snapshot.queryParamMap.get('cityId'));
    if (cityId) {
      this.form.patchValue({
        cityId,
        budget: this.queryNumber('budget', 8000),
        daysCount: this.queryNumber('daysCount', 3),
        personsCount: this.queryNumber('personsCount', 2),
        tripType: this.queryNumber('tripType', 1)
      });
      this.generate();
    }
  }

  generate(): void {
    this.submitted.set(true);
    this.formError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('من فضلك أكمل بيانات الرحلة المطلوبة.');
      return;
    }

    const value = this.form.getRawValue();
    const cityId = normalizeId(value.cityId);
    const budget = Number(value.budget);
    const daysCount = Number(value.daysCount);
    const personsCount = Number(value.personsCount);

    if (!cityId || !this.isPositiveNumber(budget) || !this.isPositiveNumber(daysCount) || !this.isPositiveNumber(personsCount)) {
      this.formError.set('بيانات الرحلة غير صحيحة. تأكد من المدينة والميزانية وعدد الأيام والأشخاص.');
      return;
    }

    const payload: TripPlannerRequest = {
      cityId,
      budget,
      daysCount,
      personsCount,
      tripType: Number(value.tripType),
      tripTypeCode: this.tripTypes().find((item) => item.value === Number(value.tripType))?.code,
      preferredAccommodationType: Number(value.preferredAccommodationType),
      preferredAccommodationTypeCode: this.accommodationTypes().find((item) => item.value === Number(value.preferredAccommodationType))?.code,
      preferredTransportType: Number(value.preferredTransportType),
      preferredTransportTypeCode: this.transportTypes().find((item) => item.value === Number(value.preferredTransportType))?.code,
      fromGovernorateId: normalizeId(value.fromGovernorateId),
      interestCodes: value.interestCodes
    };

    this.loading.set(true);
    this.planner.generate(payload).pipe(
      catchError((error: unknown) => {
        this.formError.set(error instanceof Error ? error.message : 'تعذر إنشاء الخطة.');
        return of(null);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((plan) => {
      this.plan.set(plan);
      this.active.set(plan?.scenarios?.[0]?.scenarioType ?? 'Economic');
    });
  }

  savePlan(): void {
    const plan = this.plan();
    if (plan) {
      this.auth.requireLogin('سجّل دخولك علشان نحفظ الرحلة في خططك وتلاقيها من أي جهاز.', () => {
        this.savedPlans.save(plan);
        this.toast.show('تم حفظ الخطة. ستجدها في خططي المحفوظة.', 'success');
      });
    }
  }

  sharePlan(): void {
    navigator.clipboard?.writeText(location.href);
  }

  currentScenario(): TripScenario | undefined {
    return this.recalculatedPlan()?.scenarios.find((scenario) => scenario.scenarioType === this.active());
  }

  recommendedAccommodation(scenario: TripScenario): string | undefined {
    return scenario.items.find((item) => item.itemType.toLowerCase().includes('accommodation') || item.itemType.includes('إقامة'))?.name;
  }

  recommendedActivities(scenario: TripScenario) {
    return scenario.items.filter((item) => item.itemType.toLowerCase().includes('attraction') || item.itemType.includes('نشاط')).slice(0, 4);
  }

  label(type: TripScenario['scenarioType']): string {
    const labels: Record<string, string> = { Economic: 'اقتصادي', Standard: 'متوسط', Comfortable: 'مريح' };
    return labels[type] ?? type;
  }

  days(scenario: TripScenario): number[] {
    return [...new Set(scenario.items.map((item) => item.dayNumber))].sort((a, b) => a - b);
  }

  itemsByDay(scenario: TripScenario, day: number) {
    return scenario.items.filter((item) => item.dayNumber === day);
  }

  costBreakdownItems(scenario: TripScenario): Array<{ label: string; value: number }> {
    return [
      { label: 'الإقامة', value: scenario.accommodationCost },
      { label: 'الأكل', value: scenario.foodCost },
      { label: 'المواصلات', value: scenario.transportationCost },
      { label: 'الأنشطة', value: scenario.attractionsCost }
    ];
  }

  canCustomize(item: TripScenarioItem): boolean {
    const type = item.itemType.toLowerCase();
    return type.includes('attraction') || type.includes('activity') || item.itemType.includes('نشاط');
  }

  openReplacement(scenario: TripScenario, item: TripScenarioItem): void {
    this.replacementTarget.set({ scenarioType: scenario.scenarioType, item });
    this.alternatives.set([]);
    this.loadingAlternatives.set(true);

    const cityId = normalizeId(this.form.controls.cityId.value);
    if (!cityId) {
      this.loadingAlternatives.set(false);
      return;
    }
    this.planner.getActivityAlternatives({
      cityId,
      currentActivityId: normalizeId(item.placeId),
      budgetRemaining: Math.max(0, scenario.remainingBudget)
    }).pipe(catchError(() => of([]))).subscribe((items) => {
      this.alternatives.set(items);
      this.loadingAlternatives.set(false);
    });
  }

  closeReplacement(): void {
    this.replacementTarget.set(null);
    this.alternatives.set([]);
    this.loadingAlternatives.set(false);
  }

  replaceActivity(place: ActivityAlternative): void {
    const target = this.replacementTarget();
    if (!target) {
      return;
    }

    const replacement: TripScenarioItem = {
      itemType: 'attraction',
      placeId: normalizeId(place.placeId),
      name: place.name,
      estimatedCost: Number(place.cost ?? place.estimatedCost ?? 0),
      dayNumber: target.item.dayNumber,
      notes: 'تم استبدال النشاط داخل الخطة بدون إعادة توليدها من الخادم.'
    };

    this.updateScenario(target.scenarioType, (scenario) => ({
      ...scenario,
      items: scenario.items.map((item) => item === target.item ? replacement : item)
    }));
    this.closeReplacement();
    this.toast.show('تم استبدال النشاط وتحديث التكلفة.', 'success');
  }

  removeItem(scenario: TripScenario, item: TripScenarioItem): void {
    if (!confirm('هل تريد حذف هذا البند من الخطة؟')) {
      return;
    }

    this.updateScenario(scenario.scenarioType, (current) => ({
      ...current,
      items: current.items.filter((entry) => entry !== item)
    }));
    this.toast.show('تم حذف البند وتحديث التكلفة.', 'info');
  }

  private queryNumber(key: string, fallback: number): number {
    const value = Number(this.route.snapshot.queryParamMap.get(key));
    return Number.isNaN(value) || value <= 0 ? fallback : value;
  }

  private isPositiveNumber(value: number): boolean {
    return !Number.isNaN(value) && value > 0;
  }

  private updateScenario(scenarioType: string, updater: (scenario: TripScenario) => TripScenario): void {
    this.plan.update((plan) => {
      if (!plan) {
        return plan;
      }

      return {
        ...plan,
        scenarios: plan.scenarios.map((scenario) => {
          if (scenario.scenarioType !== scenarioType) {
            return scenario;
          }

          return this.recalculateScenario(updater(scenario));
        })
      };
    });
  }

  private recalculateScenario(scenario: TripScenario): TripScenario {
    const accommodationCost = this.categoryCost(scenario.items, ['accommodation', 'إقامة'], scenario.accommodationCost);
    const transportationCost = this.categoryCost(scenario.items, ['transport', 'مواصلات'], scenario.transportationCost);
    const attractionsCost = this.categoryCost(scenario.items, ['attraction', 'activity', 'نشاط'], 0);
    const totalCost = accommodationCost + scenario.foodCost + transportationCost + attractionsCost;
    const remainingBudget = Number(this.plan()?.budget ?? this.form.controls.budget.value ?? 0) - totalCost;

    return {
      ...scenario,
      accommodationCost,
      transportationCost,
      attractionsCost,
      totalCost,
      remainingBudget,
      isOverBudget: remainingBudget < 0,
      warningMessage: remainingBudget < 0 ? 'هذه الخطة تتجاوز الميزانية بعد التعديل.' : null
    };
  }

  private categoryCost(items: TripScenarioItem[], keywords: string[], fallback: number): number {
    const matched = items.filter((item) => {
      const type = item.itemType.toLowerCase();
      return keywords.some((keyword) => type.includes(keyword) || item.itemType.includes(keyword));
    });

    return matched.length ? matched.reduce((total, item) => total + Number(item.estimatedCost ?? 0), 0) : fallback;
  }

  private applyLookup(
    groups: LookupGroup[],
    typeCode: string,
    target: { set(value: Array<{ value: number; code: string; label: string }>): void; (): Array<{ value: number; code: string; label: string }> }
  ): void {
    const group = groups.find((item) => item.typeCode === typeCode);
    if (!group?.items.length) return;
    const fallback = new Map(target().map((item) => [item.code, item.value]));
    target.set(group.items.map((item: LookupGroup['items'][number]) => ({
      value: Number(item.numericValue ?? fallback.get(item.code) ?? 0),
      code: item.code,
      label: item.nameAr || item.code
    })).filter((item: { value: number; code: string; label: string }) => item.value > 0));
  }

  toggleInterest(code: string, checked: boolean): void {
    const current = this.form.controls.interestCodes.value;
    this.form.controls.interestCodes.setValue(checked
      ? [...new Set([...current, code])]
      : current.filter((item) => item !== code));
  }
}

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { City, LookupGroup, normalizeId } from '@app/core/models/api.models';
import { BudgetCityRecommendationDto, BudgetPlannerRequest, BudgetPlannerResponse, RealTripExperiencePreviewDto } from '../models/budget-finder.model';
import { BudgetPlannerService } from '../services/budget-planner.service';
import { CitiesService } from '../../cities/services/cities.service';
import { LookupsService } from '../../lookups/services/lookups.service';
import { SavedDestinationsService } from '@app/core/services/saved-destinations.service';
import { ToastService } from '@app/core/services/toast.service';
import { BudgetStatusBadgeComponent } from '@app/shared/components/budget-status-badge/budget-status-badge.component';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';
import { SkeletonGridComponent } from '@app/shared/components/skeleton-grid/skeleton-grid.component';
import { PricePipe } from '@app/shared/pipes/price.pipe';

type SortMode = 'fit' | 'lowestCost' | 'highestRating' | 'mostExperiences' | 'mostRemaining';
type LookupOption = { value: number | string; code: string; label: string };

@Component({
  selector: 'app-go-where',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PricePipe,
    EmptyStateComponent,
    SkeletonGridComponent,
    BudgetStatusBadgeComponent
  ],
  templateUrl: './go-where.component.html',
  styleUrl: './go-where.component.scss'
})
export class GoWhereComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly planner = inject(BudgetPlannerService);
  private readonly citiesService = inject(CitiesService);
  private readonly lookups = inject(LookupsService);
  private readonly savedDestinations = inject(SavedDestinationsService);
  private readonly toast = inject(ToastService);

  readonly cities = signal<City[]>([]);
  readonly governorates = signal<Array<{ id: string | number; name: string }>>([]);
  readonly tripTypes = signal<LookupOption[]>([]);
  readonly foodLevels = signal<LookupOption[]>([]);
  readonly accommodationTypes = signal<LookupOption[]>([]);
  readonly transportTypes = signal<LookupOption[]>([]);
  readonly interestTypes = signal<LookupOption[]>([]);

  readonly loadingCities = signal(true);
  readonly loadingGovernorates = signal(true);
  readonly loadingLookups = signal(true);
  readonly loadingResults = signal(false);

  readonly citiesError = signal('');
  readonly governoratesError = signal('');
  readonly lookupError = signal('');
  readonly searchError = signal('');

  readonly searchResult = signal<BudgetPlannerResponse | null>(null);
  readonly showAlternatives = signal(false);
  readonly sortMode = signal<SortMode>('fit');
  readonly onlyWithinBudget = signal(false);

  readonly form = this.fb.nonNullable.group({
    budget: [9000],
    peopleCount: [2],
    daysCount: [3],
    cityId: [''],
    fromGovernorateId: [''],
    tripType: [''],
    foodLevel: [''],
    preferredAccommodationType: [''],
    preferredTransport: [''],
    interestCodes: this.fb.nonNullable.control<string[]>([])
  });

  readonly sortOptions: Array<{ value: SortMode; label: string }> = [
    { value: 'fit', label: 'الأفضل لك' },
    { value: 'lowestCost', label: 'الأقل تكلفة' },
    { value: 'highestRating', label: 'الأعلى تقييمًا' },
    { value: 'mostExperiences', label: 'الأكثر تجارب' },
    { value: 'mostRemaining', label: 'أكبر مبلغ متبقي' }
  ];

  readonly primaryRecommendation = computed(() => this.searchResult()?.primaryRecommendation ?? this.searchResult()?.results?.[0] ?? null);

  readonly alternativeRecommendations = computed(() => {
    const response = this.searchResult();
    const alternatives = [...(response?.alternativeRecommendations ?? response?.results?.slice(1) ?? [])];
    if (this.onlyWithinBudget()) {
      return alternatives.filter((item) => item.remainingBudget >= 0);
    }
    return alternatives;
  });

  readonly visibleRecommendationCards = computed(() => {
    const cards = this.primaryRecommendation() ? [this.primaryRecommendation() as BudgetCityRecommendationDto, ...this.alternativeRecommendations()] : [...this.alternativeRecommendations()];
    if (this.onlyWithinBudget()) {
      return cards.filter((item) => item.remainingBudget >= 0);
    }
    return cards;
  });

  readonly primaryExperiences = computed(() => {
    return this.primaryRecommendation()?.realExperiences ?? [];
  });

  readonly selectedCityLabel = computed(() => {
    const cityId = this.normalizeSelection(this.form.controls.cityId.value);
    if (!cityId) {
      return 'من غير مدينة محددة';
    }

    return this.cities().find((city) => this.normalizeSelection(city.id) === cityId)?.name ?? 'مدينة مختارة';
  });

  ngOnInit(): void {
    this.loadCities();
    this.loadGovernorates();
    this.loadLookups();
    this.savedDestinations.load().pipe(catchError(() => of([]))).subscribe();

    if (this.route.snapshot.queryParamMap.has('budget')) {
      this.form.patchValue({
        budget: this.queryNumber('budget', 9000),
        peopleCount: this.queryNumber('peopleCount', 2),
        daysCount: this.queryNumber('daysCount', 3),
        cityId: this.route.snapshot.queryParamMap.get('cityId') ?? '',
        fromGovernorateId: this.route.snapshot.queryParamMap.get('fromGovernorateId') ?? '',
        tripType: this.route.snapshot.queryParamMap.get('tripType') ?? '',
        foodLevel: this.route.snapshot.queryParamMap.get('foodLevel') ?? ''
      });
      queueMicrotask(() => this.search());
    }
  }

  search(): void {
    this.searchError.set('');
    this.showAlternatives.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.searchError.set('من فضلك كمّل بيانات الرحلة الأساسية قبل البحث.');
      return;
    }

    const value = this.form.getRawValue();
    const budget = this.positiveOrDefault(value.budget, 9000);
    const daysCount = this.positiveOrDefault(value.daysCount, 3);
    const peopleCount = this.positiveOrDefault(value.peopleCount, 2);

    const tripTypeValue = this.normalizeSelection(value.tripType);
    const tripTypeOption = this.tripTypes().find((item) => String(item.value) === tripTypeValue);
    const foodLevelOption = this.foodLevels().find((item) => item.code === this.normalizeSelection(value.foodLevel));
    const selectedFoodLevel = foodLevelOption?.code ?? this.foodLevels()[0]?.code ?? 'Economy';

    const payload: BudgetPlannerRequest = {
      budget,
      daysCount,
      peopleCount,
      cityId: this.optionalSelection(value.cityId),
      fromGovernorateId: this.optionalSelection(value.fromGovernorateId),
      tripType: Number(tripTypeValue || tripTypeOption?.value || 1),
      tripTypeCode: tripTypeOption?.code ?? this.tripTypes()[0]?.code ?? null,
      foodLevel: selectedFoodLevel,
      foodLevelCode: selectedFoodLevel,
      preferredAccommodationType: this.optionalNumber(value.preferredAccommodationType),
      preferredTransport: this.optionalNumber(value.preferredTransport),
      interestCodes: value.interestCodes
    };

    this.loadingResults.set(true);
    this.searchResult.set(null);

    this.planner.findBestCities(payload).pipe(
      catchError((error: unknown) => {
        this.searchError.set(error instanceof Error ? error.message : 'تعذر حساب الوجهات المناسبة. حاول مرة أخرى.');
        return of({
          searchId: '' as never,
          budget,
          peopleCount,
          daysCount,
          results: [],
          primaryRecommendation: null,
          alternativeRecommendations: [],
          cities: []
        } as BudgetPlannerResponse);
      }),
      finalize(() => this.loadingResults.set(false))
    ).subscribe((result) => {
      this.searchResult.set(result);

      if (!result.primaryRecommendation && !result.alternativeRecommendations?.length && !result.results?.length) {
        this.searchError.set('لم نتمكن من العثور على وجهات مناسبة الآن. جرّب ميزانية مختلفة.');
      }
    });
  }

  retryLookups(): void {
    this.loadCities();
    this.loadGovernorates();
    this.loadLookups();
  }

  setSort(value: SortMode): void {
    this.sortMode.set(value);
  }

  toggleInterest(code: string, checked: boolean): void {
    const current = this.form.controls.interestCodes.value;
    this.form.controls.interestCodes.setValue(
      checked ? [...new Set([...current, code])] : current.filter((item) => item !== code)
    );
  }

  toggleAlternatives(): void {
    this.showAlternatives.update((value) => !value);
  }

  saveDestination(result: BudgetCityRecommendationDto): void {
    const cityId = this.recommendationKey(result);
    if (!cityId) {
      this.toast.show('تعذر حفظ الوجهة لأن cityId غير موجود.', 'error');
      return;
    }

    if (this.savedDestinations.isSaved(cityId)) {
      this.savedDestinations.remove(cityId).subscribe({
        next: () => this.toast.show('تم حذف الوجهة من المدن المحفوظة.', 'info'),
        error: () => this.toast.show('تعذر حذف الوجهة المحفوظة.', 'error')
      });
      return;
    }

    this.savedDestinations.save({
      cityId,
      cityName: result.cityName,
      imageUrl: result.imageUrl,
      totalCost: result.estimatedTotalCost,
      remainingBudget: result.remainingBudget
    }).subscribe({
      next: () => this.toast.show('تم حفظ الوجهة بنجاح.', 'success'),
      error: () => this.toast.show('تعذر حفظ الوجهة. حاول مرة أخرى.', 'error')
    });
  }

  isDestinationSaved(result: BudgetCityRecommendationDto): boolean {
    return this.savedDestinations.isSaved(this.recommendationKey(result));
  }

  destinationPlanId(result: BudgetCityRecommendationDto): string {
    return this.recommendationKey(result);
  }

  cityImage(result: BudgetCityRecommendationDto): string {
    return result.imageUrl || 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1000&q=85';
  }

  recommendationLabel(result: BudgetCityRecommendationDto): string {
    return result.confidence?.labelAr || (result.remainingBudget >= 0 ? 'داخل الميزانية' : 'أعلى من الميزانية');
  }

  costPerPerson(result: BudgetCityRecommendationDto): number {
    const people = Number(this.form.controls.peopleCount.value) || 1;
    return result.estimatedTotalCost / people;
  }

  remainingBudget(result: BudgetCityRecommendationDto): number {
    return result.remainingBudget;
  }

  fitPercent(result: BudgetCityRecommendationDto): number {
    return Math.round(result.fitScore ?? 0);
  }

  primaryActivities(result: BudgetCityRecommendationDto): string[] {
    return result.recommendedActivities?.slice(0, 4).map((activity) => activity.name) ?? [];
  }

  activitiesDetails(result: BudgetCityRecommendationDto) {
    return result.recommendedActivities?.slice(0, 4) ?? [];
  }

  trackByCity(_: number, item: BudgetCityRecommendationDto): string {
    return this.recommendationKey(item);
  }

  trackByExperience(_: number, item: RealTripExperiencePreviewDto): string {
    return `${item.title}-${item.startDate ?? ''}-${item.endDate ?? ''}`;
  }

  private loadCities(): void {
    this.loadingCities.set(true);
    this.citiesError.set('');

    this.citiesService.getCities().pipe(
      catchError(() => {
        this.citiesError.set('تعذر تحميل المدن. حاول مرة أخرى.');
        return of([] as City[] | { items?: City[] });
      }),
      finalize(() => this.loadingCities.set(false))
    ).subscribe((result) => {
      this.cities.set(this.normalizeCities(result));
    });
  }

  private loadGovernorates(): void {
    this.loadingGovernorates.set(true);
    this.governoratesError.set('');

    this.citiesService.getGovernorates().pipe(
      catchError(() => {
        this.governoratesError.set('تعذر تحميل المحافظات. حاول مرة أخرى.');
        return of([] as Array<{ id: string | number; name: string }>);
      }),
      finalize(() => this.loadingGovernorates.set(false))
    ).subscribe((items) => {
      this.governorates.set(items.map((item) => ({ id: item.id, name: item.name })));
    });
  }

  private loadLookups(): void {
    this.loadingLookups.set(true);
    this.lookupError.set('');

    this.lookups.getAll().pipe(
      catchError(() => {
        this.lookupError.set('تعذر تحميل خيارات البحث. حاول مرة أخرى.');
        return of([] as LookupGroup[]);
      }),
      finalize(() => this.loadingLookups.set(false))
    ).subscribe((groups) => {
      if (!groups.length) {
        return;
      }

      this.tripTypes.set(this.toOptions(groups, 'TripType', true));
      this.foodLevels.set(this.toOptions(groups, 'FoodLevel'));
      this.accommodationTypes.set(this.toOptions(groups, 'AccommodationType', true));
      this.transportTypes.set(this.toOptions(groups, 'TransportType', true));
      this.interestTypes.set(this.toOptions(groups, 'ActivityCategory'));

      if (!this.form.controls.tripType.value && this.tripTypes().length) {
        this.form.controls.tripType.setValue(String(this.tripTypes()[0].value));
      }
      if (!this.form.controls.foodLevel.value && this.foodLevels().length) {
        this.form.controls.foodLevel.setValue(this.foodLevels()[0].code);
      }
    });
  }

  private normalizeCities(result: City[] | { items?: City[] } | null | undefined): City[] {
    if (Array.isArray(result)) {
      return result;
    }

    return result?.items ?? [];
  }

  private normalizeSelection(value: string | number | null | undefined): string {
    const text = String(value ?? '').trim();
    return text && text !== 'null' && text !== 'undefined' ? text : '';
  }

  private optionalSelection(value: string | number | null | undefined): string | null {
    const text = this.normalizeSelection(value);
    return text || null;
  }

  private recommendationKey(result: BudgetCityRecommendationDto | null | undefined): string {
    return this.normalizeSelection(result?.cityId) || this.normalizeSelection(result?.cityName);
  }

  private toOptions(groups: LookupGroup[], typeCode: string, numeric = false): LookupOption[] {
    return [...(groups.find((group) => group.typeCode === typeCode)?.items ?? [])]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((item) => ({
        value: numeric ? Number(item.numericValue) : item.code,
        code: item.code,
        label: item.nameAr || item.code
      }))
      .filter((item) => !numeric || Number.isFinite(Number(item.value)));
  }

  private optionalNumber(value: string): number | null {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  private positiveOrDefault(value: string | number, fallback: number): number {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  private queryNumber(key: string, fallback: number): number {
    const value = Number(this.route.snapshot.queryParamMap.get(key));
    return Number.isNaN(value) || value <= 0 ? fallback : value;
  }
}

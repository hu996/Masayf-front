import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of, switchMap } from 'rxjs';
import { City, CreateTripExperienceRequest, normalizeId } from '@app/core/models/api.models';
import { CitiesService } from '../../cities/services/cities.service';
import { ExperiencesService } from '../../experiences/services/experiences.service';
import { AuthService } from '@app/core/services/auth.service';

type ActivityRow = ReturnType<ShareExperienceComponent['activityRow']>;
type OtherCostRow = ReturnType<ShareExperienceComponent['otherCostRow']>;

@Component({
  selector: 'app-share-experience',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './share-experience.component.html',
  styleUrl: './share-experience.component.scss'
})
export class ShareExperienceComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ExperiencesService);
  private readonly auth = inject(AuthService);
  private readonly citiesService = inject(CitiesService);
  private readonly draftKey = 'masayef:smart-experience-draft';

  readonly step = signal(1);
  readonly loading = signal(false);
  readonly cities = signal<City[]>([]);
  readonly citiesLoading = signal(true);
  readonly citiesError = signal('');
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly uploadedPreviews = signal<string[]>([]);
  readonly selectedImageFiles = signal<File[]>([]);

  readonly steps = [
    { label: 'الرحلة', icon: '🧳' },
    { label: 'المواصلات', icon: '🚌' },
    { label: 'السكن', icon: '🏨' },
    { label: 'الأكل', icon: '🍽️' },
    { label: 'الأنشطة', icon: '🏄' },
    { label: 'مصروفات أخرى', icon: '🧾' },
    { label: 'التجربة والصور', icon: '📸' },
    { label: 'المراجعة', icon: '✅' }
  ];

  readonly tripTypes = [
    { value: 1, label: 'فردية' }, { value: 2, label: 'زوجين' },
    { value: 3, label: 'عائلة' }, { value: 4, label: 'أصدقاء' },
    { value: 5, label: 'شركة / جروب' }
  ];
  readonly transportTypes = [
    { value: 'private-car', label: 'عربية خاصة' },
    { value: 'friend-car', label: 'عربية مع حد معرفة' },
    { value: 'public', label: 'مواصلات عامة' },
    { value: 'bus', label: 'أتوبيس' }, { value: 'train', label: 'قطار' },
    { value: 'flight', label: 'طيران' }, { value: 'tour-company', label: 'شركة سياحة' },
    { value: 'none', label: 'لم أستخدم مواصلات / كنت قريب' }
  ];
  readonly accommodationTypes = [
    { value: 'owned', label: 'شقة / شاليه خاص ملكي' },
    { value: 'hosted', label: 'شقة / شاليه عند حد معرفة' },
    { value: 'apartment', label: 'شقة إيجار' }, { value: 'chalet', label: 'شاليه إيجار' },
    { value: 'hotel', label: 'فندق' }, { value: 'hostel', label: 'هوستل' },
    { value: 'camp', label: 'معسكر' }, { value: 'day-trip', label: 'يوم واحد بدون مبيت' },
    { value: 'tour-company', label: 'تابع لشركة سياحة' }
  ];
  readonly foodTypes = [
    { value: 'cooking', label: 'طبخنا في السكن' }, { value: 'restaurants', label: 'مطاعم فقط' },
    { value: 'mixed', label: 'نص طبخ ونص مطاعم' }, { value: 'hotel-included', label: 'شامل في الفندق' },
    { value: 'tour-included', label: 'شامل في شركة السياحة' }, { value: 'none', label: 'لم أصرف على أكل' }
  ];
  readonly costRanges = ['أقل من 500 جنيه', '500 إلى 1000 جنيه', '1000 إلى 2000 جنيه', '2000 إلى 5000 جنيه', 'أكثر من 5000 جنيه'];

  readonly form = this.fb.nonNullable.group({
    title: [''],
    cityId: ['', Validators.required],
    tripDate: [this.isoDate(0), Validators.required],
    daysCount: [3, [Validators.required, Validators.min(1)]],
    nightsCount: [2, [Validators.required, Validators.min(0)]],
    peopleCount: [2, [Validators.required, Validators.min(1)]],
    tripType: [3, Validators.required],
    userReportedTotalCost: [0, [Validators.required, Validators.min(0)]],
    costAccuracyType: ['approximate'],

    transportation: this.fb.nonNullable.group({
      type: ['private-car', Validators.required], fromLocation: [''], toLocation: [''],
      pricePerPerson: [0, Validators.min(0)], peopleCount: [2, Validators.min(1)], isRoundTrip: [true],
      fuelCost: [0, Validators.min(0)], tollCost: [0, Validators.min(0)], parkingCost: [0, Validators.min(0)],
      roadExtraCost: [0, Validators.min(0)], contributionCost: [0, Validators.min(0)],
      totalCost: [0, Validators.min(0)], costRange: [''], isApproximate: [false]
    }),
    accommodation: this.fb.nonNullable.group({
      type: ['hotel', Validators.required], placeName: [''], areaName: [''],
      pricePerNight: [0, Validators.min(0)], nightsCount: [2, Validators.min(0)], roomsCount: [1, Validators.min(0)],
      peopleCount: [2, Validators.min(1)], includesBreakfast: [false], cleaningFees: [0, Validators.min(0)],
      utilitiesCost: [0, Validators.min(0)], serviceCost: [0, Validators.min(0)], contributionCost: [0, Validators.min(0)],
      totalCost: [0, Validators.min(0)], costRange: [''], isApproximate: [false]
    }),
    food: this.fb.nonNullable.group({
      type: ['mixed', Validators.required], averageCostPerDay: [0, Validators.min(0)], daysCount: [3, Validators.min(1)],
      peopleCount: [2, Validators.min(1)], extraFoodCost: [0, Validators.min(0)], totalCost: [0, Validators.min(0)],
      costRange: [''], isApproximate: [false]
    }),
    hasPaidActivities: [false],
    activities: this.fb.array<ActivityRow>([]),
    otherCosts: this.fb.array<OtherCostRow>([]),

    description: [''], bestThing: [''], worstThing: [''], recommendToOthers: [true],
    overallRating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    cleanlinessRating: [5, [Validators.min(1), Validators.max(5)]], priceRating: [4, [Validators.min(1), Validators.max(5)]],
    crowdRating: [3, [Validators.min(1), Validators.max(5)]], familyFriendlyRating: [5, [Validators.min(1), Validators.max(5)]],
    youthFriendlyRating: [5, [Validators.min(1), Validators.max(5)]]
  });

  constructor() {
    this.loadCities();
    this.restoreDraft();
  }

  loadCities(): void {
    this.citiesLoading.set(true);
    this.citiesError.set('');
    this.citiesService.clearCache();
    this.citiesService.getCities().pipe(
      catchError(() => {
        this.citiesError.set('تعذر تحميل المدن. تأكد أن خادم Masayef يعمل ثم حاول مرة أخرى.');
        return of([]);
      })
    ).subscribe((result) => {
      this.cities.set(Array.isArray(result) ? result : result.items ?? []);
      this.citiesLoading.set(false);
    });
  }

  get activities(): FormArray<ActivityRow> { return this.form.controls.activities; }
  get otherCosts(): FormArray<OtherCostRow> { return this.form.controls.otherCosts; }

  isPrivateTransport(): boolean { return ['private-car', 'friend-car'].includes(this.form.controls.transportation.controls.type.value); }
  isNoTransport(): boolean { return this.form.controls.transportation.controls.type.value === 'none'; }
  isFreeAccommodation(): boolean { return ['owned', 'hosted'].includes(this.form.controls.accommodation.controls.type.value); }
  isNoAccommodation(): boolean { return this.form.controls.accommodation.controls.type.value === 'day-trip'; }
  isIncludedFood(): boolean { return ['hotel-included', 'tour-included'].includes(this.form.controls.food.controls.type.value); }
  isNoFood(): boolean { return this.form.controls.food.controls.type.value === 'none'; }

  transportationTotal(): number {
    const v = this.form.controls.transportation.getRawValue();
    if (v.type === 'none') return 0;
    const details = this.isPrivateTransport()
      ? this.sum(v.fuelCost, v.tollCost, v.parkingCost, v.roadExtraCost, v.contributionCost)
      : Number(v.pricePerPerson) * Number(v.peopleCount) * (v.isRoundTrip ? 2 : 1);
    return Number(v.totalCost) || details || this.rangeEstimate(v.costRange);
  }

  accommodationTotal(): number {
    const v = this.form.controls.accommodation.getRawValue();
    if (v.type === 'day-trip') return 0;
    const details = this.isFreeAccommodation()
      ? this.sum(v.cleaningFees, v.utilitiesCost, v.serviceCost, v.contributionCost)
      : Number(v.pricePerNight) * Number(v.nightsCount) + this.sum(v.cleaningFees, v.utilitiesCost, v.serviceCost);
    return Number(v.totalCost) || details || this.rangeEstimate(v.costRange);
  }

  foodTotal(): number {
    const v = this.form.controls.food.getRawValue();
    if (v.type === 'none') return 0;
    const details = this.isIncludedFood()
      ? Number(v.extraFoodCost)
      : Number(v.averageCostPerDay) * Number(v.daysCount) * Number(v.peopleCount) + Number(v.extraFoodCost);
    return Number(v.totalCost) || details || this.rangeEstimate(v.costRange);
  }

  activitiesTotal(): number {
    if (!this.form.controls.hasPaidActivities.value) return 0;
    return this.activities.controls.reduce((total, row) => {
      const v = row.getRawValue();
      return total + Number(v.pricePerPerson) * Number(v.peopleCount) * Number(v.timesCount);
    }, 0);
  }

  otherTotal(): number { return this.otherCosts.controls.reduce((total, row) => total + Number(row.controls.amount.value), 0); }
  calculatedTotal(): number { return this.sum(this.transportationTotal(), this.accommodationTotal(), this.foodTotal(), this.activitiesTotal(), this.otherTotal()); }
  difference(): number { return Number(this.form.controls.userReportedTotalCost.value) - this.calculatedTotal(); }
  costPerPerson(): number { return Math.round(this.calculatedTotal() / Math.max(1, Number(this.form.controls.peopleCount.value))); }
  costPerDay(): number { return Math.round(this.calculatedTotal() / Math.max(1, Number(this.form.controls.daysCount.value))); }
  costPerPersonPerDay(): number { return Math.round(this.calculatedTotal() / Math.max(1, Number(this.form.controls.peopleCount.value) * Number(this.form.controls.daysCount.value))); }
  progressPercent(): number { return Math.round(this.step() / this.steps.length * 100); }
  hasLargeDifference(): boolean { return Math.abs(this.difference()) > Math.max(500, this.calculatedTotal() * 0.15); }

  addActivity(): void { this.activities.push(this.activityRow()); }
  removeActivity(index: number): void { this.activities.removeAt(index); }
  addOtherCost(): void { this.otherCosts.push(this.otherCostRow()); }
  removeOtherCost(index: number): void { this.otherCosts.removeAt(index); }

  togglePaidActivities(): void {
    if (this.form.controls.hasPaidActivities.value && this.activities.length === 0) this.addActivity();
    if (!this.form.controls.hasPaidActivities.value) this.activities.clear();
  }

  next(): void {
    if (!this.validateStep(this.step())) return;
    this.step.update(value => Math.min(8, value + 1));
    this.scrollTop();
  }
  previous(): void { this.step.update(value => Math.max(1, value - 1)); this.scrollTop(); }
  goToStep(target: number): void {
    if (target <= this.step() || this.validateStep(this.step())) { this.step.set(target); this.scrollTop(); }
  }

  saveDraft(): void {
    this.clearMessages();
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.draftKey, JSON.stringify({ value: this.form.getRawValue(), step: this.step(), savedAt: new Date().toISOString() }));
    this.successMessage.set('تم حفظ التجربة كمسودة على هذا الجهاز بنجاح.');
  }

  submit(): void {
    this.clearMessages();
    for (let current = 1; current <= 7; current++) {
      if (!this.validateStep(current)) { this.step.set(current); return; }
    }
    const payload = this.toBackendRequest();
    if (!payload) return;
    this.auth.requireLogin('سجّل دخولك علشان تجربتك تتحفظ باسمك وتقدر ترجع لها بعدين.', () => this.send(payload));
  }

  private send(payload: CreateTripExperienceRequest): void {
    this.loading.set(true);
    this.service.share(payload).pipe(
      switchMap(experience => {
        const files = this.selectedImageFiles();
        return experience?.id && files.length
          ? this.service.uploadPhotos(experience.id, files, 0).pipe(catchError(() => of([])), switchMap(() => of(experience)))
          : of(experience);
      }),
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال التجربة. حاول مرة أخرى.');
        return of(null);
      })
    ).subscribe(result => {
      this.loading.set(false);
      if (!result) return;
      this.resetFormState();
      if (typeof localStorage !== 'undefined') localStorage.removeItem(this.draftKey);
      this.auth.refreshTripsCount();
      this.successMessage.set('تم إرسال التجربة للمراجعة بنجاح، وستظهر بعد اعتمادها.');
    });
  }

  onImagesSelected(event: Event): void {
    this.errorMessage.set('');
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).filter(file => file.type.startsWith('image/'));
    if (this.selectedImageFiles().length + files.length > 20) { this.errorMessage.set('مسموح بحد أقصى 20 صورة.'); return; }
    if (files.some(file => file.size > 5 * 1024 * 1024)) { this.errorMessage.set('حجم الصورة الواحدة يجب ألا يتجاوز 5MB.'); return; }
    this.selectedImageFiles.update(current => [...current, ...files]);
    this.uploadedPreviews.update(current => [...current, ...files.map(file => URL.createObjectURL(file))]);
  }
  removePreview(index: number): void {
    URL.revokeObjectURL(this.uploadedPreviews()[index]);
    this.uploadedPreviews.update(items => items.filter((_, i) => i !== index));
    this.selectedImageFiles.update(items => items.filter((_, i) => i !== index));
  }

  private validateStep(current: number): boolean {
    this.clearMessages();
    const v = this.form.getRawValue();
    if (current === 1) {
      this.form.controls.cityId.markAsTouched();
      if (!normalizeId(v.cityId) || v.daysCount < 1 || v.peopleCount < 1) return this.fail('اختر المدينة وأدخل عدد أيام وأشخاص صحيح.');
      if (v.nightsCount > v.daysCount) return this.fail('عدد الليالي لا يمكن أن يزيد عن عدد الأيام.');
    }
    if (current === 2 && !this.isPrivateTransport() && !this.isNoTransport()) {
      const t = v.transportation;
      if (!t.fromLocation.trim() || !t.toLocation.trim()) return this.fail('حدد مكان بداية ونهاية السفر.');
      if (!t.totalCost && !t.pricePerPerson && !t.costRange) return this.fail('أدخل تكلفة المواصلات أو اختر نطاقًا تقريبيًا.');
    }
    if (current === 3 && !this.isFreeAccommodation() && !this.isNoAccommodation()) {
      const a = v.accommodation;
      if (!a.placeName.trim()) return this.fail('اكتب اسم مكان الإقامة أو المنطقة.');
      if (!a.totalCost && !a.pricePerNight && !a.costRange) return this.fail('أدخل تكلفة السكن أو اختر نطاقًا تقريبيًا.');
    }
    if (current === 4 && !this.isIncludedFood() && !this.isNoFood()) {
      const f = v.food;
      if (!f.totalCost && !f.averageCostPerDay && !f.costRange) return this.fail('أدخل تكلفة الأكل أو اختر نطاقًا تقريبيًا.');
    }
    if (current === 5 && v.hasPaidActivities && this.activities.length === 0) return this.fail('أضف نشاطًا واحدًا على الأقل أو اختر أنه لا توجد أنشطة مدفوعة.');
    if (current === 5 && v.hasPaidActivities && this.activities.invalid) {
      this.activities.markAllAsTouched();
      return this.fail('أكمل اسم وتكلفة وعدد الأشخاص لكل نشاط.');
    }
    if (current === 6 && this.otherCosts.invalid) {
      this.otherCosts.markAllAsTouched();
      return this.fail('أكمل اسم وقيمة كل مصروف أضفته.');
    }
    if (this.form.invalid) {
      const invalidHere = current === 7 && this.form.controls.overallRating.invalid;
      if (invalidHere) return this.fail('التقييم يجب أن يكون من 1 إلى 5.');
    }
    return true;
  }

  private toBackendRequest(): CreateTripExperienceRequest | null {
    const v = this.form.getRawValue();
    const cityId = normalizeId(v.cityId);
    if (!cityId) { this.step.set(1); this.fail('اختر مدينة صحيحة.'); return null; }
    const start = new Date(v.tripDate);
    const end = new Date(start); end.setDate(end.getDate() + Number(v.daysCount));
    const expenses = [
      { category: 1, amount: this.transportationTotal(), note: `نوع المواصلات: ${v.transportation.type}` },
      { category: 2, amount: this.accommodationTotal(), note: `نوع السكن: ${v.accommodation.type}` },
      { category: 3, amount: this.foodTotal(), note: `نظام الأكل: ${v.food.type}` },
      { category: 4, amount: this.activitiesTotal(), note: this.activityNotes() },
      { category: 5, amount: this.otherTotal(), note: this.otherNotes() }
    ].filter(item => item.amount > 0);
    return {
      cityId, areaId: null,
      title: v.title.trim() || `تجربتي في ${this.cityName(cityId)}`,
      startDate: start.toISOString(), endDate: end.toISOString(),
      peopleCount: Number(v.peopleCount), adultsCount: Number(v.peopleCount), childrenCount: 0,
      tripType: Number(v.tripType), transportType: this.transportTypeNumber(v.transportation.type),
      rating: Number(v.overallRating),
      summary: this.buildSummary(),
      accommodation: this.accommodationTotal() > 0 ? {
        accommodationType: v.accommodation.type, areaId: null, nightsCount: Number(v.nightsCount),
        pricePerNight: Number(v.accommodation.pricePerNight), roomsCount: Number(v.accommodation.roomsCount), bedsCount: 0,
        wasClean: Number(v.cleanlinessRating) >= 3, nearBeach: false, comment: v.accommodation.placeName || null,
        cleanlinessRate: Number(v.cleanlinessRating)
      } : null,
      tripRating: null, expenses, visitedPlaces: [],
      photos: []
    };
  }

  private buildSummary(): string {
    const v = this.form.getRawValue();
    return [v.description, v.bestThing && `أفضل حاجة: ${v.bestThing}`, v.worstThing && `أسوأ حاجة: ${v.worstThing}`,
      `أنصح بالمكان: ${v.recommendToOthers ? 'نعم' : 'لا'}`, `الإجمالي المبلغ عنه: ${v.userReportedTotalCost} جنيه`,
      `الإجمالي المحسوب: ${this.calculatedTotal()} جنيه`, `دقة التكلفة: ${v.costAccuracyType}`].filter(Boolean).join('\n');
  }
  private activityNotes(): string { return this.activities.controls.map(row => { const v = row.getRawValue(); return `${v.name} (${v.type}) × ${v.timesCount}`; }).join('، '); }
  private otherNotes(): string { return this.otherCosts.controls.map(row => `${row.controls.name.value}: ${row.controls.notes.value}`).join('، '); }
  private cityName(id: string): string { return this.cities().find(city => normalizeId(city.id || city.cityId) === id)?.name ?? 'المصيف'; }
  private transportTypeNumber(type: string): number { return Math.max(1, this.transportTypes.findIndex(item => item.value === type) + 1); }

  private restoreDraft(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(this.draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { value?: Record<string, unknown>; step?: number };
      const value = draft.value as ReturnType<typeof this.form.getRawValue> | undefined;
      if (!value) return;
      this.activities.clear(); value.activities?.forEach(item => this.activities.push(this.activityRow(item)));
      this.otherCosts.clear(); value.otherCosts?.forEach(item => this.otherCosts.push(this.otherCostRow(item)));
      this.form.patchValue(value);
      this.step.set(Math.min(8, Math.max(1, Number(draft.step) || 1)));
      this.successMessage.set('تم استرجاع المسودة المحفوظة على هذا الجهاز.');
    } catch { localStorage.removeItem(this.draftKey); }
  }

  private activityRow(value?: Partial<{ name: string; type: string; pricePerPerson: number; peopleCount: number; timesCount: number; isApproximate: boolean; notes: string }>) {
    return this.fb.nonNullable.group({
      name: [value?.name ?? '', Validators.required], type: [value?.type ?? 'beach', Validators.required],
      pricePerPerson: [value?.pricePerPerson ?? 0, [Validators.required, Validators.min(0)]],
      peopleCount: [value?.peopleCount ?? 1, [Validators.required, Validators.min(1)]],
      timesCount: [value?.timesCount ?? 1, [Validators.required, Validators.min(1)]],
      isApproximate: [value?.isApproximate ?? false], notes: [value?.notes ?? '']
    });
  }
  private otherCostRow(value?: Partial<{ name: string; type: string; amount: number; isApproximate: boolean; notes: string }>) {
    return this.fb.nonNullable.group({
      name: [value?.name ?? '', Validators.required], type: [value?.type ?? 'other'],
      amount: [value?.amount ?? 0, [Validators.required, Validators.min(0)]],
      isApproximate: [value?.isApproximate ?? false], notes: [value?.notes ?? '']
    });
  }
  private lines(value: string): string[] { return value.split('\n').map(item => item.trim()).filter(Boolean); }
  private rangeEstimate(range: string): number {
    const estimates: Record<string, number> = {
      'أقل من 500 جنيه': 350,
      '500 إلى 1000 جنيه': 750,
      '1000 إلى 2000 جنيه': 1500,
      '2000 إلى 5000 جنيه': 3500,
      'أكثر من 5000 جنيه': 6000
    };
    return estimates[range] ?? 0;
  }
  private sum(...values: Array<number | string>): number { return values.reduce<number>((total, value) => total + Number(value || 0), 0); }
  private fail(message: string): false { this.errorMessage.set(message); return false; }
  private clearMessages(): void { this.errorMessage.set(''); this.successMessage.set(''); }
  private scrollTop(): void { if (typeof window !== 'undefined') window.scrollTo({ top: 320, behavior: 'smooth' }); }
  private isoDate(offset: number): string { const date = new Date(); date.setDate(date.getDate() + offset); return date.toISOString().slice(0, 10); }

  private resetFormState(): void {
    this.step.set(1);
    this.form.reset({
      title: '',
      cityId: '',
      tripDate: this.isoDate(0),
      daysCount: 3,
      nightsCount: 2,
      peopleCount: 2,
      tripType: 3,
      userReportedTotalCost: 0,
      costAccuracyType: 'approximate',
      transportation: {
        type: 'private-car',
        fromLocation: '',
        toLocation: '',
        pricePerPerson: 0,
        peopleCount: 2,
        isRoundTrip: true,
        fuelCost: 0,
        tollCost: 0,
        parkingCost: 0,
        roadExtraCost: 0,
        contributionCost: 0,
        totalCost: 0,
        costRange: '',
        isApproximate: false
      },
      accommodation: {
        type: 'hotel',
        placeName: '',
        areaName: '',
        pricePerNight: 0,
        nightsCount: 2,
        roomsCount: 1,
        peopleCount: 2,
        includesBreakfast: false,
        cleaningFees: 0,
        utilitiesCost: 0,
        serviceCost: 0,
        contributionCost: 0,
        totalCost: 0,
        costRange: '',
        isApproximate: false
      },
      food: {
        type: 'mixed',
        averageCostPerDay: 0,
        daysCount: 3,
        peopleCount: 2,
        extraFoodCost: 0,
        totalCost: 0,
        costRange: '',
        isApproximate: false
      },
      hasPaidActivities: false,
      activities: [],
      otherCosts: [],
      description: '',
      bestThing: '',
      worstThing: '',
      recommendToOthers: true,
      overallRating: 5,
      cleanlinessRating: 5,
      priceRating: 4,
      crowdRating: 3,
      familyFriendlyRating: 5,
      youthFriendlyRating: 5,
    });
    this.activities.clear();
    this.otherCosts.clear();
    this.uploadedPreviews.update(() => []);
    this.selectedImageFiles.update(() => []);
  }
}

import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { City, LookupGroup } from '@app/core/models/api.models';
import { CitiesService } from '../../cities/services/cities.service';
import { LookupsService } from '../../lookups/services/lookups.service';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';
import { SkeletonGridComponent } from '@app/shared/components/skeleton-grid/skeleton-grid.component';
import { SavedDestinationsService } from '@app/core/services/saved-destinations.service';
import { ToastService } from '@app/core/services/toast.service';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, EmptyStateComponent, SkeletonGridComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly citiesService = inject(CitiesService);
  private readonly lookupsService = inject(LookupsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly savedDestinations = inject(SavedDestinationsService);
  private readonly toast = inject(ToastService);

  readonly cities = signal<City[]>([]);
  readonly loading = signal(true);
  readonly tripTypes = signal<LookupGroup['items']>([]);
  readonly governorates = signal<Array<{ id: string | number; name: string }>>([]);
  readonly seaImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80';
  readonly howItWorks = [
    { title: 'ابدأ من أي نقطة', text: 'ممكن تكتب الميزانية فقط، أو تختار مدينة، أو تسيب كل الحقول فاضية وتستكشف براحتك.' },
    { title: 'نرشح لك مدن وتجارب', text: 'بنقارن تكلفة الإقامة والأكل والمواصلات والأنشطة ونظهر تجارب ناس حقيقيين.' },
    { title: 'افتح التفاصيل وقت ما تحب', text: 'من كل بطاقة تقدر تفتح التفاصيل، تشوف التجارب، أو تحفظ المدينة.' }
  ];

  readonly form = this.fb.nonNullable.group({
    budget: [''],
    peopleCount: [''],
    daysCount: [''],
    tripType: [''],
    fromGovernorateId: ['']
  });

  ngOnInit(): void {
    forkJoin({
      cities: this.citiesService.getCities().pipe(catchError(() => of([]))),
      lookups: this.lookupsService.getAll().pipe(catchError(() => of([]))),
      governorates: this.citiesService.getGovernorates().pipe(catchError(() => of([])))
    }).subscribe(({ cities, lookups, governorates }) => {
      const tripTypes = lookups.find((group) => group.typeCode === 'TripType')?.items ?? [];
      this.tripTypes.set([...tripTypes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      this.governorates.set(governorates.map((item) => ({ id: item.id, name: item.name })));
      this.cities.set(Array.isArray(cities) ? cities : cities.items ?? []);
      this.loading.set(false);
    });
  }

  cityImage(city: City): string {
    return city.mainImageUrl || city.coverImage || city.imageUrl || this.seaImage;
  }

  goWhere(): void {
    const value = this.form.getRawValue();
    const queryParams = {
      ...(this.optionalNumber(value.budget) !== null ? { budget: this.optionalNumber(value.budget) } : {}),
      ...(this.optionalNumber(value.peopleCount) !== null ? { peopleCount: this.optionalNumber(value.peopleCount) } : {}),
      ...(this.optionalNumber(value.daysCount) !== null ? { daysCount: this.optionalNumber(value.daysCount) } : {}),
      ...(this.optionalSelection(value.tripType) ? { tripType: this.optionalSelection(value.tripType) } : {}),
      ...(this.optionalSelection(value.fromGovernorateId) ? { fromGovernorateId: this.optionalSelection(value.fromGovernorateId) } : {})
    };

    this.router.navigate(['/go-where'], { queryParams });
  }

  saveCity(city: City): void {
    const cityId = city.id || city.cityId;
    if (!cityId) {
      this.toast.show('تعذر حفظ الوجهة لأن رقم المدينة غير موجود.', 'error');
      return;
    }

    this.savedDestinations.save({
      cityId,
      cityName: city.name,
      imageUrl: this.cityImage(city),
      totalCost: 0,
      remainingBudget: 0
    }).subscribe({
      next: () => this.toast.show('تم حفظ المدينة بنجاح.', 'success'),
      error: () => this.toast.show('تعذر حفظ المدينة الآن. حاول مرة أخرى.', 'error')
    });
  }

  isCitySaved(city: City): boolean {
    const cityId = city.id || city.cityId;
    return Boolean(cityId && this.savedDestinations.isSaved(cityId));
  }

  openExperiences(city: City): void {
    const cityId = city.id || city.cityId;
    this.router.navigate(['/experiences'], { queryParams: cityId ? { cityId } : undefined });
  }

  private optionalSelection(value: string | number | null | undefined): string | null {
    const text = String(value ?? '').trim();
    return text && text !== 'null' && text !== 'undefined' ? text : null;
  }

  private optionalNumber(value: string | null | undefined): number | null {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }
}

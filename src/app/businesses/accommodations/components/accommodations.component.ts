import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { City, normalizeId, Place } from '@app/core/models/api.models';
import { AccommodationsService } from '../services/accommodations.service';
import { CitiesService } from '../../cities/services/cities.service';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';
import { PlaceCardComponent } from '@app/shared/components/place-card/place-card.component';
import { SkeletonGridComponent } from '@app/shared/components/skeleton-grid/skeleton-grid.component';

@Component({
  selector: 'app-accommodations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, EmptyStateComponent, PlaceCardComponent, SkeletonGridComponent],
  templateUrl: './accommodations.component.html',
  styleUrl: './accommodations.component.scss'
})
export class AccommodationsComponent implements OnInit {
  private readonly service = inject(AccommodationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly citiesService = inject(CitiesService);

  readonly places = signal<Place[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly cities = signal<City[]>([]);
  readonly areas = signal<Array<{ id: string | number; name: string }>>([]);
  readonly loadingCities = signal(true);
  readonly loadingAreas = signal(false);
  readonly citiesError = signal('');
  readonly areasError = signal('');
  readonly selectedCityId = computed(() => this.normalizeSelection(this.filters.controls.cityId.value));

  readonly filters = this.fb.group({
    cityId: [''],
    areaId: [''],
    minPrice: [''],
    maxPrice: [''],
    personsCount: ['']
  });

  ngOnInit(): void {
    this.loadCities();

    const cityId = normalizeId(this.route.snapshot.queryParamMap.get('cityId'));
    const areaId = normalizeId(this.route.snapshot.queryParamMap.get('areaId'));
    if (cityId) {
      this.filters.patchValue({ cityId: String(cityId), areaId: areaId ? String(areaId) : '' });
      this.loadAreas(String(cityId), areaId ? String(areaId) : undefined);
    }
    this.load();
  }

  onCityChange(value: string): void {
    this.filters.patchValue({ cityId: value, areaId: '' });
    this.areas.set([]);
    this.areasError.set('');

    if (value) {
      this.loadAreas(value);
    }
  }

  load(): void {
    this.loading.set(true);
    this.service.search({ ...this.clean(this.filters.value), pageNumber: this.page(), pageSize: 9 }).pipe(catchError(() => of([]))).subscribe((result) => {
      this.places.set(Array.isArray(result) ? result : result.items ?? []);
      this.loading.set(false);
    });
  }

  retryAreas(): void {
    const cityId = this.normalizeSelection(this.filters.controls.cityId.value);
    if (cityId) {
      this.loadAreas(cityId);
    }
  }

  private loadCities(): void {
    this.loadingCities.set(true);
    this.citiesError.set('');

    this.citiesService.getCities().pipe(
      catchError(() => {
        this.citiesError.set('تعذر تحميل المدن. حاول مرة أخرى.');
        return of([] as City[] | { items?: City[] });
      })
    ).subscribe((result) => {
      this.cities.set(this.normalizeCities(result));
      this.loadingCities.set(false);
    });
  }

  private loadAreas(cityId: string, selectedAreaId?: string): void {
    this.loadingAreas.set(true);
    this.areasError.set('');

    this.citiesService.getAreasByCity(cityId).pipe(
      catchError(() => {
        this.areasError.set('تعذر تحميل المناطق الخاصة بالمدينة. حاول مرة أخرى.');
        return of([] as Array<{ id: string | number; name: string }>);
      })
    ).subscribe((result) => {
      this.areas.set(result.map((item) => ({ id: item.id, name: item.name })));
      this.loadingAreas.set(false);

      if (selectedAreaId) {
        this.filters.patchValue({ areaId: selectedAreaId });
      }
    });
  }

  private clean(value: Record<string, unknown>): Record<string, string | number> {
    const entries: Array<[string, string | number]> = [];

    Object.entries(value).forEach(([key, rawValue]) => {
      if (key === 'cityId' || key === 'areaId') {
        const id = normalizeId(rawValue);
        if (id !== null) {
          entries.push([key, id]);
        }
        return;
      }

      if (rawValue === null || rawValue === undefined || rawValue === '') {
        return;
      }

      const numberValue = Number(rawValue);
      if (!Number.isNaN(numberValue)) {
        entries.push([key, numberValue]);
      }
    });

    return Object.fromEntries(entries);
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
}

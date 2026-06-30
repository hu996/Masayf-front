import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { City } from '@app/core/models/city.model';
import { PagedResult } from '@app/core/models/paged-result.model';
import { ToastService } from '@app/core/services/toast.service';
import { resolveImageUrl } from '@app/core/utils/media-url.util';
import { AdminPlaceFormValue, AdminPlaceRow } from '../models/admin-place.model';
import { AdminPlacesService } from '../services/admin-places.service';
import { CitiesService } from '@app/core/services/cities.service';
import { MediaImage } from '@app/core/models/api.models';

type CityOption = { id: string; name: string };

@Component({
  selector: 'app-admin-places',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-places.component.html',
  styleUrl: './admin-places.component.scss'
})
export class AdminPlacesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminPlacesService);
  private readonly citiesService = inject(CitiesService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly loadingDetails = signal(false);
  readonly items = signal<AdminPlaceRow[]>([]);
  readonly cityOptions = signal<CityOption[]>([]);
  readonly selected = signal<AdminPlaceRow | null>(null);
  readonly detailImages = signal<MediaImage[]>([]);
  readonly errorMessage = signal('');
  readonly searchTerm = signal('');
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly confirmTarget = signal<AdminPlaceRow | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = 8;
  readonly typeSuggestions = ['فندق', 'منتجع', 'شقة', 'فيلا', 'مخيم', 'شاطئ', 'مزار', 'موقع'];

  readonly filteredItems = computed(() => {
    const search = this.normalize(this.searchTerm());
    if (!search) {
      return this.items();
    }

    return this.items().filter((item) =>
      [
        item.name,
        item.cityName,
        item.typeName,
        item.description,
        this.priceRange(item),
        this.statusLabel(item.isActive)
      ].some((value) => this.normalize(value).includes(search))
    );
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredItems().length / this.pageSize)));
  readonly pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredItems().slice(start, start + this.pageSize);
  });
  readonly paginationPages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    cityName: this.fb.nonNullable.control('', Validators.required),
    typeName: this.fb.nonNullable.control('', Validators.required),
    description: this.fb.nonNullable.control(''),
    priceFrom: this.fb.control<number | null>(null),
    priceTo: this.fb.control<number | null>(null),
    isActive: this.fb.nonNullable.control(true)
  });

  ngOnInit(): void {
    this.loadCities();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.service.getPlaces().pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تحميل الأماكن.');
        return of([] as AdminPlaceRow[]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((items) => {
      this.items.set(items);
      this.currentPage.set(Math.min(this.currentPage(), Math.max(1, Math.ceil(items.length / this.pageSize))));

      const selectedId = this.selected()?.id;
      if (selectedId) {
        const refreshed = items.find((item) => String(item.id) === String(selectedId));
        if (refreshed) {
          this.selected.set(refreshed);
          return;
        }
      }

      if (!this.selected() && items.length) {
        this.select(items[0]);
      }

      if (!items.length) {
        this.selected.set(null);
        this.detailImages.set([]);
      }
    });
  }

  loadCities(): void {
    this.citiesService.getCities().pipe(
      catchError(() => of([] as City[] | PagedResult<City>))
    ).subscribe((response) => {
      const cities = Array.isArray(response) ? response : response.items ?? [];
      this.cityOptions.set(
        cities
          .map((city) => ({ id: String(city.id), name: city.name }))
          .filter((city, index, list) => list.findIndex((item) => item.name.toLowerCase() === city.name.toLowerCase()) === index)
          .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      );
    });
  }

  setSearch(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.errorMessage.set('');
    this.form.reset({
      name: '',
      cityName: '',
      typeName: '',
      description: '',
      priceFrom: null,
      priceTo: null,
      isActive: true
    });
    this.modalOpen.set(true);
  }

  edit(item: AdminPlaceRow): void {
    this.editingId.set(String(item.id));
    this.errorMessage.set('');
    this.form.reset({
      name: item.name || '',
      cityName: item.cityName || '',
      typeName: item.typeName || '',
      description: item.description || '',
      priceFrom: item.priceFrom ?? null,
      priceTo: item.priceTo ?? null,
      isActive: item.isActive
    });
    this.modalOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: AdminPlaceFormValue = {
      name: raw.name.trim(),
      cityName: raw.cityName.trim(),
      typeName: raw.typeName.trim(),
      description: raw.description.trim(),
      priceFrom: this.toNumber(raw.priceFrom),
      priceTo: this.toNumber(raw.priceTo),
      isActive: raw.isActive
    };

    if (payload.priceFrom !== null && payload.priceTo !== null && payload.priceTo < payload.priceFrom) {
      this.errorMessage.set('سعر النهاية يجب أن يكون أكبر من أو يساوي سعر البداية.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const request = this.editingId()
      ? this.service.updatePlace(this.editingId()!, payload)
      : this.service.createPlace(payload);

    request.pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حفظ المكان.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((result) => {
      if (!result) {
        return;
      }

      this.toast.show(this.editingId() ? 'تم تحديث المكان بنجاح.' : 'تم إنشاء المكان بنجاح.', 'success');
      this.modalOpen.set(false);
      this.editingId.set(null);
      this.load();
      this.select(result);
    });
  }

  remove(item: AdminPlaceRow): void {
    this.confirmTarget.set(item);
  }

  confirmRemove(): void {
    const item = this.confirmTarget();
    if (!item) {
      return;
    }

    this.deleting.set(true);
    this.service.deletePlace(String(item.id)).pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حذف المكان.');
        return of(null);
      }),
      finalize(() => this.deleting.set(false))
    ).subscribe((result) => {
      if (result === null) {
        return;
      }

      this.toast.show('تم حذف المكان بنجاح.', 'success');
      if (this.selected()?.id === item.id) {
        this.selected.set(null);
        this.detailImages.set([]);
      }
      this.closeConfirm();
      this.load();
    });
  }

  closeConfirm(): void {
    this.confirmTarget.set(null);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingId.set(null);
    this.errorMessage.set('');
  }

  select(item: AdminPlaceRow): void {
    this.selected.set(item);
    this.loadingDetails.set(true);
    this.service.getImages(String(item.id)).pipe(
      catchError(() => of([] as MediaImage[])),
      finalize(() => this.loadingDetails.set(false))
    ).subscribe((images) => this.detailImages.set(images));
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.currentPage.set(1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  refresh(): void {
    this.load();
  }

  placeImage(item: AdminPlaceRow): string {
    const preferred = item.images?.find((image) => image.isMain)?.imageUrl || item.images?.[0]?.imageUrl || item.mainImageUrl;
    return resolveImageUrl(preferred, 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80');
  }

  detailImage(image: MediaImage): string {
    return resolveImageUrl(image.imageUrl, 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80');
  }

  statusLabel(isActive: boolean): string {
    return isActive ? 'نشط' : 'غير نشط';
  }

  priceRange(item: AdminPlaceRow): string {
    const from = item.priceFrom ?? null;
    const to = item.priceTo ?? null;

    if (from !== null && to !== null) {
      return `${from} - ${to}`;
    }

    if (from !== null) {
      return `${from}+`;
    }

    if (to !== null) {
      return `حتى ${to}`;
    }

    return '—';
  }

  typeLabel(value: string | null | undefined): string {
    return value?.trim() || 'غير محدد';
  }

  cityLabel(value: string | null | undefined): string {
    return value?.trim() || 'غير محدد';
  }

  private toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private normalize(value: string | number | boolean | null | undefined): string {
    return String(value ?? '').trim().toLowerCase();
  }
}

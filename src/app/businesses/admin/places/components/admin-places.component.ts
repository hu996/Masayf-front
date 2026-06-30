import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { City, Area } from '@app/core/models/city.model';
import { PagedResult } from '@app/core/models/paged-result.model';
import { ToastService } from '@app/core/services/toast.service';
import { resolveImageUrl } from '@app/core/utils/media-url.util';
import { AdminAccessService } from '../../shared/services/admin-access.service';
import {
  AdminPlaceFormValue,
  AdminPlaceImageDraft,
  AdminPlaceImageUploadDraft,
  AdminPlaceRow
} from '../models/admin-place.model';
import { AdminPlacesService } from '../services/admin-places.service';
import { CitiesService } from '@app/core/services/cities.service';
import { MediaImage } from '@app/core/models/api.models';
import { ApiId } from '@app/core/models/api-id.model';

type CityOption = { id: string; name: string };
type AreaOption = { id: string; name: string };
type PlaceTypeOption = { value: string; label: string };

@Component({
  selector: 'app-admin-places',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-places.component.html',
  styleUrl: './admin-places.component.scss'
})
export class AdminPlacesComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminPlacesService);
  private readonly citiesService = inject(CitiesService);
  private readonly access = inject(AdminAccessService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly loadingImages = signal(false);
  readonly savingImages = signal(false);
  readonly items = signal<AdminPlaceRow[]>([]);
  readonly cityOptions = signal<CityOption[]>([]);
  readonly areaOptions = signal<AreaOption[]>([]);
  readonly imageDrafts = signal<AdminPlaceImageDraft[]>([]);
  readonly uploadDrafts = signal<AdminPlaceImageUploadDraft[]>([]);
  readonly selectedPlace = signal<AdminPlaceRow | null>(null);
  readonly selectedImages = signal<MediaImage[]>([]);
  readonly errorMessage = signal('');
  readonly imageError = signal('');
  readonly searchTerm = signal('');
  readonly cityFilter = signal('');
  readonly typeFilter = signal('');
  readonly modalOpen = signal(false);
  readonly imageModalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly confirmTarget = signal<AdminPlaceRow | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = 8;
  readonly baseTypeOptions: PlaceTypeOption[] = [
    { value: 'Hotel', label: 'فندق' },
    { value: 'Resort', label: 'منتجع' },
    { value: 'Apartment', label: 'شقة' },
    { value: 'Villa', label: 'فيلا' },
    { value: 'Camp', label: 'مخيم' },
    { value: 'Beach', label: 'شاطئ' },
    { value: 'Landmark', label: 'مَعْلَم' },
    { value: 'Site', label: 'موقع' }
  ];

  readonly canViewPlaces = computed(() => this.access.canAccess('admin.places.view'));
  readonly canCreatePlaces = computed(() => this.access.canAccess('admin.places.create'));
  readonly canEditPlaces = computed(() => this.access.canAccess('admin.places.edit'));
  readonly canDeletePlaces = computed(() => this.access.canAccess('admin.places.delete'));
  readonly canManageImages = computed(() => this.access.canAccess('admin.places.manageImages'));

  readonly filteredItems = computed(() => {
    const search = this.normalize(this.searchTerm());
    return this.items().filter((item) => {
      const matchesSearch = !search || [
        item.name,
        item.cityName,
        item.areaName,
        item.type,
        item.category,
        item.address,
        item.description
      ].some((value) => this.normalize(value).includes(search));

      return matchesSearch;
    });
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
  readonly typeOptions = computed(() => {
    const existing = this.items()
      .map((item) => this.normalizeType(item.type))
      .filter(Boolean);
    const merged = new Map<string, string>();

    for (const option of this.baseTypeOptions) {
      merged.set(this.normalizeType(option.value), option.value);
    }
    for (const value of existing) {
      merged.set(this.normalizeType(value), value);
    }

    return [...merged.values()]
      .map((value) => ({ value, label: this.typeLabel(value) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  });

  readonly form = this.fb.group({
    cityId: this.fb.nonNullable.control('', Validators.required),
    areaId: this.fb.nonNullable.control(''),
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    type: this.fb.nonNullable.control('', Validators.required),
    description: this.fb.nonNullable.control(''),
    address: this.fb.nonNullable.control(''),
    latitude: this.fb.control<number | null>(null),
    longitude: this.fb.control<number | null>(null),
    priceFrom: this.fb.control<number | null>(null),
    priceTo: this.fb.control<number | null>(null),
    pricePerNight: this.fb.control<number | null>(null),
    capacity: this.fb.control<number | null>(null),
    averageRating: this.fb.control<number | null>(null),
    durationHours: this.fb.control<number | null>(null),
    category: this.fb.nonNullable.control(''),
    isActive: this.fb.nonNullable.control(true)
  });

  ngOnInit(): void {
    this.loadLookups();
    this.load();

    this.form.controls.cityId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((cityId) => {
      this.loadAreas(cityId || '');
      if (this.form.controls.areaId.value) {
        this.form.controls.areaId.setValue('');
      }
    });
  }

  loadLookups(): void {
    this.loadCities();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.service.getPlaces({
      cityId: this.cityFilter() || null,
      type: this.typeFilter() || null
    }).pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تحميل الأماكن.');
        return of([] as AdminPlaceRow[]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((items) => {
      this.items.set(items);
      this.currentPage.set(Math.min(this.currentPage(), Math.max(1, Math.ceil(items.length / this.pageSize))));

      if (this.selectedPlace()) {
        const refreshed = items.find((item) => String(item.id) === String(this.selectedPlace()?.id));
        if (refreshed) {
          this.view(refreshed);
          return;
        }
      } else if (items.length) {
        this.view(items[0]);
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
          .filter((city, index, list) => list.findIndex((item) => item.id === city.id) === index)
          .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      );
    });
  }

  loadAreas(cityId: string): void {
    if (!cityId) {
      this.areaOptions.set([]);
      return;
    }

    this.citiesService.getAreasByCity(cityId as ApiId).pipe(
      catchError(() => of([] as Area[]))
    ).subscribe((areas) => {
      this.areaOptions.set(
        areas
          .map((area) => ({ id: String(area.id), name: area.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      );
    });
  }

  openCreate(): void {
    if (!this.canCreatePlaces()) return;

    this.editingId.set(null);
    this.errorMessage.set('');
    this.form.reset({
      cityId: '',
      areaId: '',
      name: '',
      type: '',
      description: '',
      address: '',
      latitude: null,
      longitude: null,
      priceFrom: null,
      priceTo: null,
      pricePerNight: null,
      capacity: null,
      averageRating: null,
      durationHours: null,
      category: '',
      isActive: true
    });
    this.loadAreas('');
    this.modalOpen.set(true);
  }

  openFilter(type: 'city' | 'type', value: string): void {
    if (type === 'city') {
      this.cityFilter.set(value);
    } else {
      this.typeFilter.set(value);
    }
    this.currentPage.set(1);
    this.load();
  }

  clearFilters(): void {
    this.cityFilter.set('');
    this.typeFilter.set('');
    this.searchTerm.set('');
    this.currentPage.set(1);
    this.load();
  }

  setSearch(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
  }

  edit(item: AdminPlaceRow): void {
    if (!this.canEditPlaces()) return;

    this.editingId.set(String(item.id));
    this.errorMessage.set('');
    this.form.reset({
      cityId: item.cityId ? String(item.cityId) : '',
      areaId: item.areaId ? String(item.areaId) : '',
      name: item.name || '',
      type: item.type || '',
      description: item.description || '',
      address: item.address || '',
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      priceFrom: item.priceFrom ?? null,
      priceTo: item.priceTo ?? null,
      pricePerNight: item.pricePerNight ?? null,
      capacity: item.capacity ?? null,
      averageRating: item.averageRating ?? null,
      durationHours: item.durationHours ?? null,
      category: item.category || '',
      isActive: item.isActive
    });
    this.loadAreas(item.cityId ? String(item.cityId) : '');
    this.modalOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: AdminPlaceFormValue = {
      cityId: raw.cityId || null,
      areaId: raw.areaId || null,
      name: raw.name.trim(),
      type: raw.type.trim(),
      description: raw.description.trim(),
      address: raw.address.trim(),
      latitude: this.toNumber(raw.latitude),
      longitude: this.toNumber(raw.longitude),
      priceFrom: this.toNumber(raw.priceFrom),
      priceTo: this.toNumber(raw.priceTo),
      pricePerNight: this.toNumber(raw.pricePerNight),
      capacity: this.toNumber(raw.capacity),
      averageRating: this.toNumber(raw.averageRating),
      durationHours: this.toNumber(raw.durationHours),
      category: raw.category.trim(),
      isActive: raw.isActive
    };

    if (!payload.cityId) {
      this.errorMessage.set('اختر المدينة أولاً.');
      return;
    }

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
      if (!result) return;

      this.toast.show(this.editingId() ? 'تم تحديث المكان بنجاح.' : 'تم إنشاء المكان بنجاح.', 'success');
      this.modalOpen.set(false);
      this.editingId.set(null);
      this.load();
      this.view(result);
    });
  }

  remove(item: AdminPlaceRow): void {
    if (!this.canDeletePlaces()) return;
    this.confirmTarget.set(item);
  }

  changePage(page: number): void {
    const nextPage = Math.min(Math.max(1, page), this.totalPages());
    if (nextPage === this.currentPage()) {
      return;
    }

    this.currentPage.set(nextPage);
  }

  confirmRemove(): void {
    const item = this.confirmTarget();
    if (!item) return;

    this.deleting.set(true);
    this.service.deletePlace(String(item.id)).pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حذف المكان.');
        return of(null);
      }),
      finalize(() => this.deleting.set(false))
    ).subscribe((result) => {
      if (result === null) return;

      this.toast.show('تم تعطيل المكان بنجاح.', 'success');
      if (this.selectedPlace()?.id === item.id) {
        this.selectedPlace.set(null);
        this.selectedImages.set([]);
      }
      this.closeConfirm();
      this.load();
    });
  }

  openImages(item?: AdminPlaceRow): void {
    if (!this.canManageImages()) return;

    const target = item ?? this.selectedPlace();
    if (!target) return;

    this.view(target);
    this.syncImageDrafts(this.selectedImages());
    this.uploadDrafts.set([]);
    this.imageError.set('');
    this.imageModalOpen.set(true);
  }

  closeImages(): void {
    this.imageModalOpen.set(false);
    this.uploadDrafts().forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
    this.uploadDrafts.set([]);
    this.imageError.set('');
  }

  setUploadMain(index: number): void {
    if (index < 0 || index >= this.uploadDrafts().length) return;
    this.uploadDrafts.update((items) =>
      items.map((item, currentIndex) => ({ ...item, main: currentIndex === index }))
    );
  }

  addUploadDrafts(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const drafts = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      main: false
    }));

    this.uploadDrafts.update((current) => [...current, ...drafts]);
    if (this.uploadDrafts().length === drafts.length) {
      this.setUploadMain(0);
    }
    input.value = '';
  }

  removeUploadDraft(index: number): void {
    const target = this.uploadDrafts()[index];
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }

    this.uploadDrafts.update((current) => current.filter((_, currentIndex) => currentIndex !== index));
    if (this.uploadDrafts().length) {
      const nextMain = Math.min(index, this.uploadDrafts().length - 1);
      this.setUploadMain(nextMain);
    }
  }

  uploadImages(): void {
    const target = this.selectedPlace();
    const drafts = this.uploadDrafts();
    if (!target) return;
    if (!drafts.length) {
      this.imageError.set('أضف صورة واحدة على الأقل.');
      return;
    }

    this.savingImages.set(true);
    this.imageError.set('');

    const files = drafts.map((draft) => draft.file);
    const mainIndex = drafts.findIndex((draft) => draft.main);

    this.service.uploadImages(String(target.id), files, mainIndex >= 0 ? mainIndex : 0).pipe(
      switchMap(() => this.service.getImages(String(target.id))),
      catchError((error: unknown) => {
        this.imageError.set(error instanceof Error ? error.message : 'تعذر رفع الصور.');
        return of([] as MediaImage[]);
      }),
      finalize(() => this.savingImages.set(false))
    ).subscribe((images) => {
      if (!images.length) return;
      this.toast.show('تم رفع الصور بنجاح.', 'success');
      this.selectedImages.set(images);
      this.syncImageDrafts(images);
      this.uploadDrafts().forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
      this.uploadDrafts.set([]);
    });
  }

  setMainImage(imageIndex: number): void {
    this.imageDrafts.update((items) =>
      items.map((item, currentIndex) => ({ ...item, isMain: currentIndex === imageIndex }))
    );
  }

  updateImageDraft(index: number, patch: Partial<AdminPlaceImageDraft>): void {
    this.imageDrafts.update((items) =>
      items.map((item, currentIndex) => currentIndex === index ? { ...item, ...patch } : item)
    );
  }

  moveImage(index: number, direction: -1 | 1): void {
    const items = [...this.imageDrafts()];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    [items[index], items[target]] = [items[target], items[index]];
    items.forEach((item, currentIndex) => {
      item.sortOrder = currentIndex + 1;
    });
    this.imageDrafts.set(items);
  }

  saveImageChanges(): void {
    const target = this.selectedPlace();
    if (!target) return;

    const drafts = this.imageDrafts();
    const originalIds = this.selectedImages().map((image) => String(image.id ?? image.imageUrl));
    const orderIds = drafts.map((item) => String(item.id ?? item.imageUrl));
    const reorderChanged = orderIds.join('|') !== originalIds.join('|');

    const updateRequests = drafts
      .filter((draft) => draft.id)
      .map((draft) => {
        const original = this.selectedImages().find((image) => String(image.id) === String(draft.id));
        const changed =
          draft.caption !== (original?.caption ?? null) ||
          draft.isMain !== Boolean(original?.isMain) ||
          draft.sortOrder !== (original?.sortOrder ?? null);

        if (!changed) {
          return of(null);
        }

        return this.service.updateImage(String(target.id), String(draft.id), {
          caption: draft.caption ?? null,
          isMain: draft.isMain ?? false,
          sortOrder: draft.sortOrder ?? undefined
        });
      });

    const reorderRequest = reorderChanged
      ? this.service.reorderImages(String(target.id), drafts.map((item) => String(item.id ?? item.imageUrl)))
      : of(null);

    this.savingImages.set(true);
    this.imageError.set('');

    forkJoin([...updateRequests, reorderRequest]).pipe(
      switchMap(() => this.service.getImages(String(target.id))),
      catchError((error: unknown) => {
        this.imageError.set(error instanceof Error ? error.message : 'تعذر حفظ تعديلات الصور.');
        return of([] as MediaImage[]);
      }),
      finalize(() => this.savingImages.set(false))
    ).subscribe((images) => {
      if (!images.length) return;
      this.toast.show('تم تحديث صور المكان بنجاح.', 'success');
      this.selectedImages.set(images);
      this.syncImageDrafts(images);
    });
  }

  removeImage(image: AdminPlaceImageDraft): void {
    const target = this.selectedPlace();
    if (!target || !image.id) return;

    this.service.deleteImage(String(target.id), String(image.id)).pipe(
      catchError((error: unknown) => {
        this.imageError.set(error instanceof Error ? error.message : 'تعذر حذف الصورة.');
        return of(null);
      })
    ).subscribe((result) => {
      if (result === null) return;
      this.toast.show('تم حذف الصورة بنجاح.', 'success');
      const next = this.selectedImages().filter((item) => String(item.id) !== String(image.id));
      this.selectedImages.set(next);
      this.syncImageDrafts(next);
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

  refresh(): void {
    this.load();
  }

  manageImageCount(): number {
    return this.selectedImages().length;
  }

  placeImage(item: AdminPlaceRow): string {
    const preferred = item.images?.find((image) => image.isMain)?.imageUrl || item.images?.[0]?.imageUrl || item.mainImageUrl;
    return resolveImageUrl(preferred, 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80');
  }

  imageUrl(image: MediaImage | AdminPlaceImageDraft): string {
    return resolveImageUrl(image.imageUrl, 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80');
  }

  setCityFilter(cityId: string): void {
    this.cityFilter.set(cityId);
    this.currentPage.set(1);
    this.load();
  }

  setTypeFilter(type: string): void {
    this.typeFilter.set(type);
    this.currentPage.set(1);
    this.load();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.currentPage.set(1);
  }

  statusLabel(isActive: boolean): string {
    return isActive ? 'نشط' : 'غير نشط';
  }

  priceRange(item: AdminPlaceRow): string {
    const from = item.priceFrom ?? null;
    const to = item.priceTo ?? null;
    if (from !== null && to !== null) return `${from} - ${to}`;
    if (from !== null) return `${from}+`;
    if (to !== null) return `حتى ${to}`;
    return '—';
  }

  typeLabel(value: string | null | undefined): string {
    const normalized = this.normalizeType(value);
    return this.typeOptions().find((option) => this.normalizeType(option.value) === normalized)?.label || value?.trim() || 'غير محدد';
  }

  cityLabel(value: string | null | undefined): string {
    return value?.trim() || 'غير محدد';
  }

  canShowAction(permission: boolean): boolean {
    return permission;
  }

  view(item: AdminPlaceRow): void {
    this.selectedPlace.set(item);
    this.loadingImages.set(true);
    this.service.getImages(String(item.id)).pipe(
      catchError(() => of([] as MediaImage[])),
      finalize(() => this.loadingImages.set(false))
    ).subscribe((images) => {
      this.selectedImages.set(images);
      this.syncImageDrafts(images);
    });
  }

  private syncImageDrafts(images: MediaImage[]): void {
    const drafts = images.map((image, index) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      caption: image.caption ?? '',
      isMain: Boolean(image.isMain),
      sortOrder: image.sortOrder ?? index + 1,
      originalCaption: image.caption ?? '',
      originalIsMain: Boolean(image.isMain),
      originalSortOrder: image.sortOrder ?? index + 1
    }));

    this.imageDrafts.set(drafts);
  }

  private normalizeType(value: string | null | undefined): string {
    return String(value ?? '').trim().toLowerCase();
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

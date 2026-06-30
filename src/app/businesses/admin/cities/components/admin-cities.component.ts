import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { CitiesService } from '@app/core/services/cities.service';
import { resolveImageUrl } from '@app/core/utils/media-url.util';
import { AdminCitiesService } from '../services/admin-cities.service';
import { AdminCityFormValue, AdminCityRow } from '../models/admin-city.model';
import { MediaImage } from '@app/core/models/api.models';
import { AdminGovernorateSelectComponent } from '../../shared/components/admin-governorate-select.component';

type GovernorateOption = { id: string; name: string };
type CityPhotoDraft = {
  file: File;
  previewUrl: string;
};

type LevelOption = {
  value: number;
  label: string;
  hint: string;
};

@Component({
  selector: 'app-admin-cities',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AdminGovernorateSelectComponent],
  templateUrl: './admin-cities.component.html',
  styleUrl: './admin-cities.component.scss'
})
export class AdminCitiesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminCitiesService);
  private readonly citiesService = inject(CitiesService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly items = signal<AdminCityRow[]>([]);
  readonly governorates = signal<GovernorateOption[]>([]);
  readonly errorMessage = signal('');
  readonly searchTerm = signal('');
  readonly editingId = signal<string | null>(null);
  readonly modalOpen = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = 8;
  readonly photoDrafts = signal<CityPhotoDraft[]>([]);
  readonly existingPhotos = signal<MediaImage[]>([]);
  readonly mainPhotoIndex = signal(0);
  readonly photosError = signal('');
  readonly crowdLevelOptions: LevelOption[] = [
    { value: 1, label: 'هادئ', hint: 'حركة قليلة ومريح' },
    { value: 2, label: 'متوازن', hint: 'نشاط طبيعي ومتوسط' },
    { value: 3, label: 'نشط', hint: 'حركة واضحة ونشاط أعلى' },
    { value: 4, label: 'مزدحم', hint: 'مدينة حيوية جدًا' }
  ];
  readonly priceLevelOptions: LevelOption[] = [
    { value: 1, label: 'اقتصادي', hint: 'مناسب للميزانيات الأقل' },
    { value: 2, label: 'متوسط', hint: 'خيار متوازن ومعتدل' },
    { value: 3, label: 'مرتفع', hint: 'تكلفة أعلى نسبيًا' },
    { value: 4, label: 'فاخر', hint: 'فئة راقية جدًا' }
  ];

  readonly filteredItems = computed(() => {
    const search = this.normalize(this.searchTerm());
    if (!search) return this.items();

    return this.items().filter((item) =>
      [item.name, item.governorateName, item.description, item.crowdLevel, item.priceLevel].some((value) =>
        this.normalize(value).includes(search)
      )
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
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    for (let page = start; page <= end; page++) {
      pages.push(page);
    }
    return pages;
  });

  readonly form = this.fb.nonNullable.group({
    governorateId: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    suitableForFamilies: [true],
    suitableForYouth: [true],
    suitableForKids: [true],
    crowdLevel: [0, [Validators.required, Validators.min(1)]],
    priceLevel: [0, [Validators.required, Validators.min(1)]],
    isActive: [true]
  });

  ngOnInit(): void {
    this.loadGovernorates();
    this.load();
  }

  loadGovernorates(): void {
    this.citiesService.getGovernorates().pipe(
      catchError(() => of([] as GovernorateOption[]))
    ).subscribe((governorates) => this.governorates.set(
      (governorates ?? []).map((item) => ({ id: String(item.id), name: item.name }))
    ));
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.service.getCities().pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تحميل المدن.');
        return of([] as AdminCityRow[]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((items) => {
      this.items.set(items);
      this.currentPage.set(Math.min(this.currentPage(), Math.max(1, Math.ceil(this.filteredItems().length / this.pageSize))));
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: AdminCityFormValue = {
      governorateId: raw.governorateId || null,
      name: raw.name.trim(),
      description: raw.description.trim(),
      suitableForFamilies: raw.suitableForFamilies,
      suitableForYouth: raw.suitableForYouth,
      suitableForKids: raw.suitableForKids,
      crowdLevel: Number(raw.crowdLevel),
      priceLevel: Number(raw.priceLevel),
      isActive: raw.isActive,
      photos: this.isEditing() ? undefined : this.photoDrafts().map((item) => item.file),
      mainImageIndex: this.isEditing() ? null : this.mainPhotoIndex()
    };

    if (!this.editingId() && !payload.governorateId) {
      this.errorMessage.set('اختر المحافظة أولًا.');
      return;
    }

    if (!this.editingId() && !(payload.photos?.length ?? 0)) {
      this.photosError.set('أضف صورة واحدة على الأقل.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.photosError.set('');

    const request = this.editingId()
      ? this.service.updateCity(this.editingId()!, payload)
      : this.service.createCity(payload);

    request.pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حفظ المدينة.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((result) => {
      if (result) {
        this.resetForm();
        this.load();
      }
    });
  }

  edit(item: AdminCityRow): void {
    this.editingId.set(String(item.id));
    this.modalOpen.set(true);
    this.photoDrafts.set([]);
    this.existingPhotos.set(item.images?.length ? item.images : item.mainImageUrl ? [{ imageUrl: item.mainImageUrl, isMain: true }] : []);
    this.mainPhotoIndex.set(0);
    const governorate = this.governorates().find((g) => g.name === item.governorateName);

    this.form.patchValue({
      governorateId: String(item.governorateId ?? governorate?.id ?? ''),
      name: item.name,
      description: item.description || '',
      crowdLevel: item.crowdLevel || 0,
      priceLevel: item.priceLevel || 0,
      suitableForFamilies: true,
      suitableForYouth: true,
      suitableForKids: true,
      isActive: true
    });

    this.form.controls.governorateId.disable({ emitEvent: false });
  }

  remove(item: AdminCityRow): void {
    if (!confirm(`حذف المدينة "${item.name}"؟`)) {
      return;
    }

    this.service.deleteCity(String(item.id)).pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حذف المدينة.');
        return of(null);
      })
    ).subscribe((result) => {
      if (result !== null) {
        this.resetForm();
        this.load();
      }
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.clearPhotos();
    this.existingPhotos.set([]);
    this.form.reset({
      governorateId: '',
      name: '',
      description: '',
      suitableForFamilies: true,
      suitableForYouth: true,
      suitableForKids: true,
      crowdLevel: 0,
      priceLevel: 0,
      isActive: true
    });
    this.form.controls.governorateId.enable({ emitEvent: false });
  }

  openCreate(): void {
    this.resetForm();
    this.existingPhotos.set([]);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    if (!this.editingId()) {
      this.clearPhotos();
    }
  }

  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const drafts = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    const combined = [...this.photoDrafts(), ...drafts];
    this.photoDrafts.set(combined);
    if (this.mainPhotoIndex() >= combined.length) {
      this.mainPhotoIndex.set(0);
    }
    this.photosError.set('');
    input.value = '';
  }

  removePhoto(index: number): void {
    const next = this.photoDrafts().filter((_, itemIndex) => itemIndex !== index);
    this.photoDrafts().forEach((item, itemIndex) => {
      if (itemIndex === index) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    this.photoDrafts.set(next);
    if (!next.length) {
      this.mainPhotoIndex.set(0);
      return;
    }

    if (this.mainPhotoIndex() >= next.length) {
      this.mainPhotoIndex.set(0);
    }
  }

  setMainPhoto(index: number): void {
    if (index < 0 || index >= this.photoDrafts().length) return;
    this.mainPhotoIndex.set(index);
  }

  clearPhotos(): void {
    this.photoDrafts().forEach((item) => URL.revokeObjectURL(item.previewUrl));
    this.photoDrafts.set([]);
    this.mainPhotoIndex.set(0);
    this.photosError.set('');
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.currentPage.set(1);
  }

  governorateLabel(governorateId: string | null | undefined): string {
    if (!governorateId) {
      return '—';
    }

    return this.governorates().find((item) => item.id === governorateId)?.name ?? '—';
  }

  cityImage(item: AdminCityRow): string {
    const preferred = item.images?.find((image) => image.isMain)?.imageUrl || item.images?.[0]?.imageUrl || item.mainImageUrl;
    return resolveImageUrl(preferred, 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80');
  }

  photoPreview(photo: CityPhotoDraft): string {
    return photo.previewUrl;
  }

  existingPhotoUrl(photo: MediaImage): string {
    return resolveImageUrl(photo.imageUrl, 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80');
  }

  crowdLevelLabel(value: number | null | undefined): string {
    return this.crowdLevelOptions.find((item) => item.value === value)?.label ?? 'غير محدد';
  }

  crowdLevelHint(value: number | null | undefined): string {
    return this.crowdLevelOptions.find((item) => item.value === value)?.hint ?? '';
  }

  priceLevelLabel(value: number | null | undefined): string {
    return this.priceLevelOptions.find((item) => item.value === value)?.label ?? 'غير محدد';
  }

  priceLevelHint(value: number | null | undefined): string {
    return this.priceLevelOptions.find((item) => item.value === value)?.hint ?? '';
  }

  isEditing(): boolean {
    return Boolean(this.editingId());
  }

  private normalize(value: string | number | boolean | null | undefined): string {
    return String(value ?? '').trim().toLowerCase();
  }
}

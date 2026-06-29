import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { AdminCitiesService } from '../services/admin-cities.service';
import { AdminPriceProfilesService } from '../services/admin-price-profiles.service';
import { AdminCityRow } from '../models/admin-city.model';
import { AdminPriceProfileFormValue, AdminPriceProfileRow } from '../models/admin-price-profile.model';

@Component({
  selector: 'app-admin-price-profiles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-price-profiles.component.html',
  styleUrl: './admin-price-profiles.component.scss'
})
export class AdminPriceProfilesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminPriceProfilesService);
  private readonly citiesService = inject(AdminCitiesService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly items = signal<AdminPriceProfileRow[]>([]);
  readonly cities = signal<AdminCityRow[]>([]);
  readonly errorMessage = signal('');
  readonly editingId = signal<string | null>(null);

  readonly filterForm = this.fb.nonNullable.group({
    cityId: ['']
  });

  readonly form = this.fb.nonNullable.group({
    cityId: [''],
    level: [''],
    costPerPersonPerDay: [0],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadCities();
    this.load();
  }

  loadCities(): void {
    this.citiesService.getCities().pipe(
      catchError(() => of([] as AdminCityRow[]))
    ).subscribe((cities) => this.cities.set(cities));
  }

  load(): void {
    this.loading.set(true);
    const cityId = this.filterForm.controls.cityId.value || null;

    this.service.getProfiles(cityId).pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تحميل ملفات الأسعار.');
        return of([] as AdminPriceProfileRow[]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((items) => this.items.set(items));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    if (!raw.cityId) {
      this.errorMessage.set('من فضلك اختر مدينة.');
      return;
    }
    if (!raw.level.trim()) {
      this.errorMessage.set('من فضلك اكتب المستوى.');
      return;
    }

    this.saving.set(true);
    const payload: AdminPriceProfileFormValue = {
      cityId: raw.cityId,
      level: raw.level.trim(),
      costPerPersonPerDay: Number(raw.costPerPersonPerDay),
      notes: raw.notes?.trim() || null
    };

    const request = this.editingId()
      ? this.service.updateProfile(this.editingId()!, payload)
      : this.service.createProfile(payload);

    request.pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حفظ ملف السعر.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((result) => {
      if (result !== null) {
        this.resetForm();
        this.load();
      }
    });
  }

  edit(item: AdminPriceProfileRow): void {
    this.editingId.set(String(item.id));
    this.form.patchValue({
      cityId: String(item.cityId),
      level: item.level,
      costPerPersonPerDay: item.costPerPersonPerDay,
      notes: item.notes || ''
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset({
      cityId: '',
      level: '',
      costPerPersonPerDay: 0,
      notes: ''
    });
  }

  cityName(cityId: string): string {
    return this.cities().find((city) => String(city.id) === cityId)?.name || '—';
  }
}

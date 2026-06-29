import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { CitiesService } from '@app/core/services/cities.service';
import { AdminCitiesService } from '../services/admin-cities.service';
import { AdminCityFormValue, AdminCityRow } from '../models/admin-city.model';

type GovernorateOption = { id: string; name: string };

@Component({
  selector: 'app-admin-cities',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
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
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    governorateId: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    mainImageUrl: [''],
    suitableForFamilies: [true],
    suitableForYouth: [true],
    suitableForKids: [true],
    crowdLevel: [3, [Validators.required, Validators.min(1)]],
    priceLevel: [3, [Validators.required, Validators.min(1)]],
    isActive: [true]
  });

  ngOnInit(): void {
    this.loadGovernorates();
    this.load();
  }

  loadGovernorates(): void {
    this.citiesService.getGovernorates().pipe(
      catchError(() => of([] as GovernorateOption[]))
    ).subscribe((governorates) => this.governorates.set(governorates));
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
    ).subscribe((items) => this.items.set(items));
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
      mainImageUrl: raw.mainImageUrl.trim() || null,
      suitableForFamilies: raw.suitableForFamilies,
      suitableForYouth: raw.suitableForYouth,
      suitableForKids: raw.suitableForKids,
      crowdLevel: Number(raw.crowdLevel),
      priceLevel: Number(raw.priceLevel),
      isActive: raw.isActive
    };

    if (!this.editingId() && !payload.governorateId) {
      this.errorMessage.set('اختر المحافظة أولًا.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

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
    const governorate = this.governorates().find((g) => g.name === item.governorateName);

    this.form.patchValue({
      governorateId: governorate?.id || '',
      name: item.name,
      description: item.description || '',
      mainImageUrl: item.mainImageUrl || '',
      crowdLevel: item.crowdLevel || 3,
      priceLevel: item.priceLevel || 3,
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
    this.form.reset({
      governorateId: '',
      name: '',
      description: '',
      mainImageUrl: '',
      suitableForFamilies: true,
      suitableForYouth: true,
      suitableForKids: true,
      crowdLevel: 3,
      priceLevel: 3,
      isActive: true
    });
    this.form.controls.governorateId.enable({ emitEvent: false });
  }

  governorateLabel(governorateId: string | null | undefined): string {
    if (!governorateId) {
      return '—';
    }

    return this.governorates().find((item) => item.id === governorateId)?.name ?? '—';
  }
}

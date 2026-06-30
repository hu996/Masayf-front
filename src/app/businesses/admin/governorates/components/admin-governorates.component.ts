import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { ToastService } from '@app/core/services/toast.service';
import { AdminGovernorateFormValue, AdminGovernorateRow } from '../models/admin-governorate.model';
import { AdminGovernoratesService } from '../services/admin-governorates.service';

@Component({
  selector: 'app-admin-governorates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-governorates.component.html',
  styleUrl: './admin-governorates.component.scss'
})
export class AdminGovernoratesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminGovernoratesService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly items = signal<AdminGovernorateRow[]>([]);
  readonly searchTerm = signal('');
  readonly modalOpen = signal(false);

  readonly filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.items().filter((item) => !term || item.name.toLowerCase().includes(term));
  });

  readonly totalCities = computed(() =>
    this.filteredItems().reduce((sum, item) => sum + Number(item.citiesCount ?? item.cityCount ?? item.totalCities ?? 0), 0)
  );

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.service.getGovernorates().pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تحميل المحافظات.');
        return of([] as AdminGovernorateRow[]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((items) => this.items.set(items ?? []));
  }

  openCreate(): void {
    this.form.reset({ name: '' });
    this.errorMessage.set('');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.errorMessage.set('');
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: AdminGovernorateFormValue = { name: raw.name.trim() };

    if (!payload.name) {
      this.errorMessage.set('اسم المحافظة مطلوب.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    this.service.addGovernorate(payload).pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حفظ المحافظة.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((result) => {
      if (!result) return;

      this.toast.show('تمت إضافة المحافظة بنجاح.', 'success');
      this.form.reset({ name: '' });
      this.modalOpen.set(false);
      this.load();
    });
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  countLabel(item: AdminGovernorateRow): string {
    const value = item.citiesCount ?? item.cityCount ?? item.totalCities ?? null;
    return value === null || value === undefined ? '—' : String(value);
  }

  createdAtLabel(item: AdminGovernorateRow): string {
    const value = item.createdAt ?? item.addedAt;
    if (!value) return '—';

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ar-EG');
  }

  trackGovernorate(item: AdminGovernorateRow, index: number): string {
    const id = String(item.id ?? '').trim();
    if (id && id !== '0') {
      return `id-${id}`;
    }

    const name = String(item.name ?? '').trim().toLowerCase();
    return `name-${name || 'governorate'}-${index}`;
  }
}

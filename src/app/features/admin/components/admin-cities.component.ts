import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { AdminCitiesService } from '../services/admin-cities.service';
import { AdminCityRow } from '../models/admin-city.model';

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

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly items = signal<AdminCityRow[]>([]);
  readonly errorMessage = signal('');
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: [''],
    governorateName: [''],
    priceLevelName: [''],
    crowdLevelName: [''],
    mainImageUrl: [''],
    isActive: [true]
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getCities().pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تحميل المدن.');
        return of([] as AdminCityRow[]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((items) => this.items.set(items));
  }

  save(): void {
    this.saving.set(true);
    const payload = this.form.getRawValue();
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
    this.form.patchValue({
      name: item.name,
      governorateName: item.governorateName || '',
      priceLevelName: item.priceLevelName || '',
      crowdLevelName: item.crowdLevelName || '',
      mainImageUrl: item.mainImageUrl || '',
      isActive: item.isActive
    });
  }

  toggle(item: AdminCityRow): void {
    this.service.toggleActive(String(item.id)).subscribe(() => this.load());
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      governorateName: '',
      priceLevelName: '',
      crowdLevelName: '',
      mainImageUrl: '',
      isActive: true
    });
  }
}

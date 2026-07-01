import { ChangeDetectionStrategy, Component, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminGovernoratesService } from '../../governorates/services/admin-governorates.service';
import { AdminGovernorateRow } from '../../governorates/models/admin-governorate.model';

@Component({
  selector: 'app-admin-governorate-select',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-governorate-select.component.html',
  styleUrl: './admin-governorate-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AdminGovernorateSelectComponent),
      multi: true
    }
  ]
})
export class AdminGovernorateSelectComponent implements ControlValueAccessor {
  private readonly service = inject(AdminGovernoratesService);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly governorates = signal<AdminGovernorateRow[]>([]);
  readonly value = signal('');
  readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.service.getGovernorates().pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (items) => this.governorates.set(items ?? []),
      error: (error: unknown) => {
        this.error.set(error instanceof Error ? error.message : 'تعذر تحميل المحافظات.');
        this.governorates.set([]);
      }
    });
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onSelect(value: string): void {
    this.value.set(value);
    this.onChange(value);
    this.markTouched();
  }

  markTouched(): void {
    this.onTouched();
  }

  trackById(_: number, item: AdminGovernorateRow): string {
    return String(item.id ?? item.name);
  }

  label(item: AdminGovernorateRow): string {
    return item.name;
  }
}

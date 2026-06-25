import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { AdminSettingFormValue, AdminSettingRow } from '../models/admin-setting.model';
import { AdminSettingsService } from '../services/admin-settings.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss'
})
export class AdminSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminSettingsService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly items = signal<AdminSettingRow[]>([]);
  readonly errorMessage = signal('');
  readonly selectedGroup = signal('');
  readonly editingId = signal<string | null>(null);

  readonly groups = computed(() => [...new Set(this.items().map((item) => item.group))]);

  readonly form = this.fb.nonNullable.group({
    key: [''],
    value: [''],
    group: ['Homepage'],
    description: [''],
    isPublic: [false]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getSettings(this.selectedGroup()).pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تحميل الإعدادات.');
        return of([] as AdminSettingRow[]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((items) => this.items.set(items));
  }

  applyGroup(group: string): void {
    this.selectedGroup.set(group);
    this.load();
  }

  save(): void {
    this.saving.set(true);
    const payload: AdminSettingFormValue = this.form.getRawValue();
    const request = this.editingId()
      ? this.service.updateSetting(this.editingId()!, payload)
      : this.service.createSetting(payload);

    request.pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حفظ الإعداد.');
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

  edit(item: AdminSettingRow): void {
    this.editingId.set(String(item.id));
    this.form.patchValue({
      key: item.key,
      value: item.value,
      group: item.group,
      description: item.description || '',
      isPublic: item.isPublic
    });
  }

  remove(item: AdminSettingRow): void {
    this.service.deleteSetting(String(item.id)).subscribe(() => this.load());
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset({
      key: '',
      value: '',
      group: this.selectedGroup() || 'Homepage',
      description: '',
      isPublic: false
    });
  }
}

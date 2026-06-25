import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, finalize, of, startWith } from 'rxjs';
import { LookupTypeFormValue, LookupTypeRow, PagedResult } from '../../models/admin-lookup.model';
import { AdminLookupsService } from '../../services/admin-lookups.service';
import { ToastService } from '@app/core/services/toast.service';

type Mode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-lookup-types',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './lookup-types.component.html',
  styleUrl: './lookup-types.component.scss'
})
export class LookupTypesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminLookupsService);
  private readonly toast = inject(ToastService);

  readonly filters = this.fb.group({
    search: [''],
    isActive: [null as boolean | null],
    isSystem: [null as boolean | null]
  });

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(100)]],
    nameAr: ['', [Validators.required, Validators.maxLength(200)]],
    nameEn: [''],
    sortOrder: [0, [Validators.required, Validators.min(0)]],
    isActive: [true]
  });

  readonly rows = signal<LookupTypeRow[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly mode = signal<Mode>('create');
  readonly selectedId = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly totalCount = signal(0);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));

  ngOnInit(): void {
    this.filters.valueChanges.pipe(startWith(this.filters.getRawValue()), debounceTime(200)).subscribe(() => {
      this.page.set(1);
      this.fetch();
    });
  }

  loadPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.page.set(page);
    this.fetch();
  }

  openCreate(): void {
    this.mode.set('create');
    this.selectedId.set(null);
    this.form.reset({ code: '', nameAr: '', nameEn: '', sortOrder: 0, isActive: true });
    this.form.enable({ emitEvent: false });
  }

  openView(row: LookupTypeRow): void {
    this.mode.set('view');
    this.selectedId.set(row.id);
    this.form.reset({
      code: row.code,
      nameAr: row.nameAr,
      nameEn: row.nameEn ?? '',
      sortOrder: row.sortOrder ?? 0,
      isActive: row.isActive
    });
    this.form.disable({ emitEvent: false });
  }

  openEdit(row: LookupTypeRow): void {
    this.mode.set('edit');
    this.selectedId.set(row.id);
    this.form.reset({
      code: row.code,
      nameAr: row.nameAr,
      nameEn: row.nameEn ?? '',
      sortOrder: row.sortOrder ?? 0,
      isActive: row.isActive
    });
    this.form.enable({ emitEvent: false });
  }

  submit(): void {
    if (this.mode() === 'view') {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('راجِع البيانات المطلوبة قبل الحفظ.');
      return;
    }

    const raw = this.form.getRawValue();
    const body: LookupTypeFormValue = {
      code: (raw.code || '').trim(),
      nameAr: (raw.nameAr || '').trim(),
      nameEn: this.emptyToNull(raw.nameEn),
      sortOrder: Number(raw.sortOrder ?? 0),
      isActive: Boolean(raw.isActive)
    };

    this.saving.set(true);
    const request$ = this.mode() === 'edit' && this.selectedId()
      ? this.service.updateType(this.selectedId()!, body)
      : this.service.createType(body);

    request$.pipe(
      finalize(() => this.saving.set(false)),
      catchError((error: unknown) => {
        this.error.set(error instanceof Error ? error.message : 'تعذر حفظ نوع الـ lookup.');
        return of(null);
      })
    ).subscribe((result) => {
      this.toast.show(this.mode() === 'edit' ? 'تم تحديث نوع الـ lookup.' : 'تم إنشاء نوع الـ lookup.', 'success');
      this.form.enable({ emitEvent: false });
      this.openCreate();
      this.fetch();
    });
  }

  remove(row: LookupTypeRow): void {
    if (row.isSystem) {
      this.toast.show('لا يمكن حذف السجلات النظامية.', 'info');
      return;
    }

    if (!confirm(`هل تريد حذف نوع "${row.nameAr}"؟`)) {
      return;
    }

    this.service.deleteType(row.id).pipe(
      catchError((error: unknown) => {
        this.error.set(error instanceof Error ? error.message : 'تعذر حذف النوع.');
        return of(null);
      })
    ).subscribe((result) => {
      this.toast.show('تم حذف نوع الـ lookup.', 'success');
      if (this.selectedId() === row.id) {
        this.openCreate();
      }
      this.fetch();
    });
  }

  isProtected(row: LookupTypeRow): boolean {
    return row.isSystem;
  }

  filtersSummary(): string {
    const value = this.filters.getRawValue();
    return [value.search?.trim(), value.isActive === null ? null : value.isActive ? 'Active' : 'Inactive', value.isSystem === null ? null : value.isSystem ? 'System' : 'Custom']
      .filter(Boolean)
      .join(' • ');
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set('');

    const filters = this.filters.getRawValue();
    this.service.getTypes({
      pageNumber: this.page(),
      pageSize: this.pageSize(),
      search: (filters.search || '').trim() || undefined,
      isActive: filters.isActive,
      isSystem: filters.isSystem
    }).pipe(
      catchError((error: unknown) => {
        this.error.set(error instanceof Error ? error.message : 'تعذر تحميل أنواع الـ lookup.');
        return of({ items: [], totalCount: 0, pageNumber: 1, pageSize: this.pageSize(), totalPages: 1 } satisfies PagedResult<LookupTypeRow>);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((result) => {
      this.rows.set(result.items ?? []);
      this.totalCount.set(result.totalCount ?? result.items?.length ?? 0);
    });
  }

  private emptyToNull(value: string | null | undefined): string | null {
    const text = (value ?? '').trim();
    return text.length ? text : null;
  }
}

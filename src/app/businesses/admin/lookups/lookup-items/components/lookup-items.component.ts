import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, finalize, of, startWith } from 'rxjs';
import {
  LookupItemFormValue,
  LookupItemRow,
  LookupTypeRow,
  PagedResult
} from '../../models/admin-lookup.model';
import { AdminLookupsService } from '../../services/admin-lookups.service';
import { ToastService } from '@app/core/services/toast.service';

type Mode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-lookup-items',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './lookup-items.component.html',
  styleUrl: './lookup-items.component.scss'
})
export class LookupItemsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminLookupsService);
  private readonly toast = inject(ToastService);

  readonly types = signal<LookupTypeRow[]>([]);
  readonly items = signal<LookupItemRow[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly mode = signal<Mode>('create');
  readonly selectedId = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly totalCount = signal(0);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));

  readonly filters = this.fb.group({
    lookupTypeId: [null as string | null],
    lookupTypeCode: [''],
    isActive: [null as boolean | null],
    isSystem: [null as boolean | null]
  });

  readonly form = this.fb.group({
    lookupTypeId: [null as string | null, Validators.required],
    code: ['', [Validators.required, Validators.maxLength(100)]],
    numericValue: [null as number | null],
    nameAr: ['', [Validators.required, Validators.maxLength(200)]],
    nameEn: [''],
    descriptionAr: [''],
    descriptionEn: [''],
    icon: [''],
    color: [''],
    sortOrder: [0, [Validators.required, Validators.min(0)]],
    isActive: [true],
    isAccommodationType: [false],
    isAttractionType: [false]
  });

  ngOnInit(): void {
    this.loadTypes();
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
    this.form.reset({
      lookupTypeId: this.filters.controls.lookupTypeId.value ?? this.types()[0]?.id ?? null,
      code: '',
      numericValue: null,
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      icon: '',
      color: '',
      sortOrder: 0,
      isActive: true,
      isAccommodationType: false,
      isAttractionType: false
    });
    this.form.enable({ emitEvent: false });
  }

  openView(row: LookupItemRow): void {
    this.mode.set('view');
    this.selectedId.set(row.id);
    this.form.reset({
      lookupTypeId: row.lookupTypeId,
      code: row.code,
      numericValue: row.numericValue ?? null,
      nameAr: row.nameAr,
      nameEn: row.nameEn ?? '',
      descriptionAr: row.descriptionAr ?? '',
      descriptionEn: row.descriptionEn ?? '',
      icon: row.icon ?? '',
      color: row.color ?? '',
      sortOrder: row.sortOrder ?? 0,
      isActive: row.isActive,
      isAccommodationType: row.isAccommodationType,
      isAttractionType: row.isAttractionType
    });
    this.form.disable({ emitEvent: false });
  }

  openEdit(row: LookupItemRow): void {
    this.mode.set('edit');
    this.selectedId.set(row.id);
    this.form.reset({
      lookupTypeId: row.lookupTypeId,
      code: row.code,
      numericValue: row.numericValue ?? null,
      nameAr: row.nameAr,
      nameEn: row.nameEn ?? '',
      descriptionAr: row.descriptionAr ?? '',
      descriptionEn: row.descriptionEn ?? '',
      icon: row.icon ?? '',
      color: row.color ?? '',
      sortOrder: row.sortOrder ?? 0,
      isActive: row.isActive,
      isAccommodationType: row.isAccommodationType,
      isAttractionType: row.isAttractionType
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
    const body: LookupItemFormValue = {
      lookupTypeId: raw.lookupTypeId,
      code: (raw.code || '').trim(),
      numericValue: this.emptyToNullNumber(raw.numericValue),
      nameAr: (raw.nameAr || '').trim(),
      nameEn: this.emptyToNull(raw.nameEn),
      descriptionAr: this.emptyToNull(raw.descriptionAr),
      descriptionEn: this.emptyToNull(raw.descriptionEn),
      icon: this.emptyToNull(raw.icon),
      color: this.emptyToNull(raw.color),
      sortOrder: Number(raw.sortOrder ?? 0),
      isActive: Boolean(raw.isActive),
      isAccommodationType: Boolean(raw.isAccommodationType),
      isAttractionType: Boolean(raw.isAttractionType)
    };

    this.saving.set(true);
    const request$ = this.mode() === 'edit' && this.selectedId()
      ? this.service.updateItem(this.selectedId()!, body)
      : this.service.createItem({ ...body, isSystem: false });

    request$.pipe(
      finalize(() => this.saving.set(false)),
      catchError((error: unknown) => {
        this.error.set(error instanceof Error ? error.message : 'تعذر حفظ الـ lookup item.');
        return of(null);
      })
    ).subscribe((result) => {
      this.toast.show(this.mode() === 'edit' ? 'تم تحديث الـ lookup item.' : 'تم إنشاء lookup item جديد.', 'success');
      this.openCreate();
      this.fetch();
    });
  }

  remove(row: LookupItemRow): void {
    if (row.isSystem) {
      this.toast.show('لا يمكن حذف السجلات النظامية.', 'info');
      return;
    }

    if (!confirm(`هل تريد حذف "${row.nameAr}"؟`)) {
      return;
    }

    this.service.deleteItem(row.id).pipe(
      catchError((error: unknown) => {
        this.error.set(error instanceof Error ? error.message : 'تعذر حذف الـ lookup item.');
        return of(null);
      })
    ).subscribe((result) => {
      this.toast.show('تم حذف الـ lookup item.', 'success');
      if (this.selectedId() === row.id) {
        this.openCreate();
      }
      this.fetch();
    });
  }

  isProtected(row: LookupItemRow): boolean {
    return row.isSystem;
  }

  typeName(typeId: string): string {
    return this.types().find((item) => item.id === typeId)?.nameAr || typeId;
  }

  filtersSummary(): string {
    const value = this.filters.getRawValue();
    return [this.typeName(value.lookupTypeId || ''), value.lookupTypeCode?.trim(), value.isActive === null ? null : value.isActive ? 'Active' : 'Inactive', value.isSystem === null ? null : value.isSystem ? 'System' : 'Custom']
      .filter(Boolean)
      .join(' • ');
  }

  private loadTypes(): void {
    this.service.getTypes({ pageNumber: 1, pageSize: 500 }).pipe(
      catchError(() => of({ items: [] } satisfies PagedResult<LookupTypeRow>))
    ).subscribe((result) => {
      this.types.set(result.items ?? []);
      if (!this.form.controls.lookupTypeId.value && result.items?.length) {
        this.form.controls.lookupTypeId.setValue(result.items[0].id);
      }
      this.fetch();
    });
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set('');

    const filters = this.filters.getRawValue();
    this.service.getItems({
      pageNumber: this.page(),
      pageSize: this.pageSize(),
      lookupTypeId: filters.lookupTypeId || undefined,
      lookupTypeCode: (filters.lookupTypeCode || '').trim() || undefined,
      isActive: filters.isActive,
      isSystem: filters.isSystem
    }).pipe(
      catchError((error: unknown) => {
        this.error.set(error instanceof Error ? error.message : 'تعذر تحميل lookup items.');
        return of({ items: [], totalCount: 0, pageNumber: 1, pageSize: this.pageSize(), totalPages: 1 } satisfies PagedResult<LookupItemRow>);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((result) => {
      this.items.set(result.items ?? []);
      this.totalCount.set(result.totalCount ?? result.items?.length ?? 0);
    });
  }

  private emptyToNull(value: string | null | undefined): string | null {
    const text = (value ?? '').trim();
    return text.length ? text : null;
  }

  private emptyToNullNumber(value: number | null | undefined): number | null {
    return value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value);
  }
}

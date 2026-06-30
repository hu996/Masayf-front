import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ToastService } from '@app/core/services/toast.service';
import { AdminAccessService } from '../../shared/services/admin-access.service';
import { AdminUserFormValue, AdminUserRow } from '../models/admin-user.model';
import { AdminUsersService } from '../services/admin-users.service';
import { AdminRolesService } from '../../roles/services/admin-roles.service';
import { AdminRoleRow } from '../../roles/models/admin-role.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss'
})
export class AdminUsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminUsersService);
  private readonly rolesService = inject(AdminRolesService);
  private readonly access = inject(AdminAccessService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly actionLoading = signal(false);
  readonly errorMessage = signal('');
  readonly items = signal<AdminUserRow[]>([]);
  readonly roles = signal<AdminRoleRow[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly confirmTarget = signal<AdminUserRow | null>(null);
  readonly confirmNextState = signal<boolean | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = 8;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.items().length / this.pageSize)));
  readonly pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.items().slice(start, start + this.pageSize);
  });
  readonly paginationPages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  readonly filterForm = this.fb.nonNullable.group({
    search: ['']
  });

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    userName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    roleName: ['', Validators.required],
    isActive: [true]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    const search = this.filterForm.controls.search.value;

    forkJoin({
      users: this.service.getUsers(search).pipe(catchError(() => of([] as AdminUserRow[]))),
      roles: this.rolesService.getRoles().pipe(catchError(() => of([] as AdminRoleRow[])))
    }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe(({ users, roles }) => {
      this.items.set(users);
      this.roles.set(roles);
      this.currentPage.set(Math.min(this.currentPage(), Math.max(1, Math.ceil(users.length / this.pageSize))));

      if (this.editingId()) {
        const item = users.find((user) => String(user.id) === this.editingId());
        if (item) {
          this.patchForm(item);
        }
      }
    });
  }

  search(): void {
    this.load();
  }

  save(): void {
    const payload = this.buildPayload();

    if (!this.editingId() && !payload.password) {
      this.errorMessage.set('أدخل كلمة المرور للمستخدم الجديد.');
      return;
    }

    this.saving.set(true);
    const request = this.editingId()
      ? this.service.updateUser(this.editingId()!, payload)
      : this.service.createUser(payload as Required<AdminUserFormValue>);

    request.pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حفظ المستخدم.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((result) => {
      if (result) {
        this.toast.show(this.editingId() ? 'تم تحديث المستخدم بنجاح.' : 'تم إنشاء المستخدم بنجاح.', 'success');
        this.resetForm();
        this.load();
      }
    });
  }

  edit(item: AdminUserRow): void {
    this.editingId.set(String(item.id));
    this.errorMessage.set('');
    this.patchForm(item);
  }

  askToggle(item: AdminUserRow): void {
    this.confirmTarget.set(item);
    this.confirmNextState.set(!item.isActive);
  }

  confirmToggle(): void {
    const item = this.confirmTarget();
    const nextState = this.confirmNextState();
    if (!item || nextState === null) return;

    this.actionLoading.set(true);
    this.service.toggleActive(String(item.id)).pipe(
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر تغيير حالة المستخدم.');
        return of(null);
      }),
      finalize(() => this.actionLoading.set(false))
    ).subscribe((result) => {
      if (result) {
        this.toast.show(nextState ? 'تم تفعيل المستخدم.' : 'تم تعطيل المستخدم.', 'success');
        this.closeConfirm();
        this.load();
      }
    });
  }

  closeConfirm(): void {
    this.confirmTarget.set(null);
    this.confirmNextState.set(null);
  }

  resetForm(): void {
    this.editingId.set(null);
    this.errorMessage.set('');
    this.form.reset({
      fullName: '',
      userName: '',
      email: '',
      password: '',
      roleName: '',
      isActive: true
    });
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  cancelEdit(): void {
    this.resetForm();
  }

  roleLabel(roleName: string): string {
    return this.roles().find((role) => role.name === roleName)?.displayName || roleName || 'غير محدد';
  }

  selectedRoleLabel(): string {
    return this.roleLabel(this.form.controls.roleName.value);
  }

  createdAt(item: AdminUserRow): string {
    return item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-EG') : '—';
  }

  canManageUsers(): boolean {
    return this.access.canAccess(
      'admin.users.view',
      'admin.users.edit',
      'admin.users.create',
      'users.view',
      'users.edit',
      'users.create'
    );
  }

  isActiveLabel(value: boolean): string {
    return value ? 'نشط' : 'غير نشط';
  }

  private patchForm(item: AdminUserRow): void {
    this.form.patchValue({
      fullName: item.fullName,
      userName: item.userName,
      email: item.email,
      password: '',
      roleName: item.roleName || item.roles?.[0] || '',
      isActive: item.isActive
    });
  }

  private buildPayload(): AdminUserFormValue {
    return {
      fullName: this.form.controls.fullName.value.trim(),
      userName: this.form.controls.userName.value.trim(),
      email: this.form.controls.email.value.trim(),
      password: this.form.controls.password.value || undefined,
      roleName: this.form.controls.roleName.value,
      isActive: this.form.controls.isActive.value
    };
  }
}

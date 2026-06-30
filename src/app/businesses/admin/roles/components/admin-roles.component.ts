import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { ToastService } from '@app/core/services/toast.service';
import { AdminPermissionGroup, AdminPermissionItem } from '../../permissions/models/admin-permission.model';
import { AdminPermissionsService } from '../../permissions/services/admin-permissions.service';
import { AdminAccessService } from '../../shared/services/admin-access.service';
import { AdminRoleFormValue, AdminRoleRow } from '../models/admin-role.model';
import { AdminRolesService } from '../services/admin-roles.service';

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-roles.component.html',
  styleUrl: './admin-roles.component.scss'
})
export class AdminRolesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rolesService = inject(AdminRolesService);
  private readonly permissionsService = inject(AdminPermissionsService);
  private readonly access = inject(AdminAccessService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly errorMessage = signal('');
  readonly roles = signal<AdminRoleRow[]>([]);
  readonly catalog = signal<AdminPermissionGroup[]>([]);
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly selectedPermissionIds = signal<string[]>([]);
  readonly currentPermissionIds = signal<string[]>([]);
  readonly searchTerm = signal('');
  readonly permissionSearch = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 6;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['']
  });

  readonly filteredRoles = computed(() => {
    const search = this.normalize(this.searchTerm());
    const roles = this.roles();

    if (!search) {
      return roles;
    }

    return roles.filter((role) =>
      [role.name, role.displayName, role.description]
        .some((value) => this.normalize(value).includes(search))
    );
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRoles().length / this.pageSize)));

  readonly pagedRoles = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredRoles().slice(start, start + this.pageSize);
  });

  readonly paginationPages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  readonly selectedRole = computed(() => this.roles().find((role) => String(role.id) === this.editingId()) ?? null);

  readonly filteredCatalog = computed(() => {
    const search = this.normalize(this.permissionSearch());

    return this.catalog()
      .map((group) => ({
        ...group,
        items: group.items.filter((permission) => !search || this.matchesPermission(permission, search))
      }))
      .filter((group) => group.items.length > 0);
  });

  readonly selectedCount = computed(() => this.selectedPermissionIds().length);
  readonly availableCount = computed(() => this.catalog().flatMap((group) => group.items).length);
  readonly canManage = computed(() => this.access.canAccess('admin.roles.create', 'admin.roles.edit', 'admin.roles.managePermissions', 'admin.roles.delete'));
  readonly modalTitle = computed(() => this.editingId() ? 'تعديل الدور' : 'إضافة دور جديد');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      roles: this.rolesService.getRoles().pipe(catchError(() => of([] as AdminRoleRow[]))),
      catalog: this.permissionsService.getCatalog().pipe(catchError(() => of([] as AdminPermissionGroup[])))
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(({ roles, catalog }) => {
        this.roles.set(roles);
        this.catalog.set(this.decorateCatalog(catalog));
        this.currentPage.set(Math.min(this.currentPage(), Math.max(1, Math.ceil(Math.max(roles.length, 1) / this.pageSize))));

        if (this.editingId()) {
          const role = roles.find((item) => String(item.id) === this.editingId());
          if (role) {
            this.patchRole(role);
          }
        }
      });
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.currentPage.set(1);
  }

  changePage(page: number): void {
    const nextPage = Math.min(Math.max(1, page), this.totalPages());
    this.currentPage.set(nextPage);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.errorMessage.set('');
    this.permissionSearch.set('');
    this.selectedPermissionIds.set([]);
    this.currentPermissionIds.set([]);
    this.form.reset({
      name: '',
      description: ''
    });
    this.modalOpen.set(true);
  }

  openEdit(role: AdminRoleRow): void {
    this.editingId.set(String(role.id));
    this.errorMessage.set('');
    this.permissionSearch.set('');
    this.patchRole(role);
    this.modalOpen.set(true);

    if (role.permissionKeys?.length) {
      const ids = [...new Set(role.permissionKeys.map((item) => String(item)))];
      this.currentPermissionIds.set(ids);
      this.selectedPermissionIds.set(ids);
      return;
    }

    this.rolesService.getRolePermissions(String(role.id)).pipe(
      catchError(() => of([] as string[]))
    ).subscribe((permissionIds) => {
      const ids = [...new Set(permissionIds.map((item) => String(item)))];
      this.currentPermissionIds.set(ids);
      this.selectedPermissionIds.set(ids);
    });
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingId.set(null);
    this.permissionSearch.set('');
    this.errorMessage.set('');
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: AdminRoleFormValue = {
      name: raw.name.trim(),
      description: raw.description?.trim() || undefined,
      permissionKeys: [...new Set(this.selectedPermissionIds())]
    };

    if (!payload.name) {
      this.errorMessage.set('اسم الدور مطلوب.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const request$ = this.editingId()
      ? this.rolesService.updateRole(this.editingId()!, payload)
      : this.rolesService.createRole(payload);

    request$
      .pipe(
        switchMap((role) =>
          this.rolesService.updateRolePermissions(String(role.id), payload.permissionKeys).pipe(map(() => role))
        ),
        switchMap((role) => this.access.refreshSidebar().pipe(map(() => role))),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          this.toast.show(this.editingId() ? 'تم تحديث الدور بنجاح.' : 'تم إنشاء الدور بنجاح.', 'success');
          this.closeModal();
          this.load();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error, 'تعذر حفظ الدور.'));
        }
      });
  }

  remove(role: AdminRoleRow): void {
    if (!confirm(`هل تريد حذف الدور "${role.displayName || role.name}"؟`)) {
      return;
    }

    this.deleting.set(true);
    this.rolesService.deleteRole(String(role.id)).pipe(
      finalize(() => this.deleting.set(false)),
      catchError((error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'تعذر حذف الدور.'));
        return of(null);
      })
    ).subscribe((result) => {
      if (result === null) {
        return;
      }

      this.toast.show('تم حذف الدور بنجاح.', 'success');
      if (this.editingId() === String(role.id)) {
        this.closeModal();
      }
      this.load();
    });
  }

  updatePermissionSearch(value: string): void {
    this.permissionSearch.set(value);
  }

  clearPermissionSearch(): void {
    this.permissionSearch.set('');
  }

  togglePermission(permissionId: string, checked: boolean): void {
    this.selectedPermissionIds.update((current) =>
      checked ? [...new Set([...current, permissionId])] : current.filter((item) => item !== permissionId)
    );
  }

  toggleGroup(group: AdminPermissionGroup, checked: boolean): void {
    const ids = group.items.map((item) => this.permissionId(item));
    this.selectedPermissionIds.update((current) => {
      const set = new Set(current);
      ids.forEach((id) => {
        if (checked) {
          set.add(id);
        } else {
          set.delete(id);
        }
      });
      return [...set];
    });
  }

  isSelected(permissionId: string): boolean {
    return this.selectedPermissionIds().includes(permissionId);
  }

  isGroupSelected(group: AdminPermissionGroup): boolean {
    return group.items.length > 0 && group.items.every((item) => this.isSelected(this.permissionId(item)));
  }

  isGroupPartial(group: AdminPermissionGroup): boolean {
    const selected = group.items.filter((item) => this.isSelected(this.permissionId(item))).length;
    return selected > 0 && selected < group.items.length;
  }

  resetPermissions(): void {
    this.selectedPermissionIds.set([...this.currentPermissionIds()]);
  }

  roleMeta(role: AdminRoleRow): string {
    const permissionCount = role.permissionKeys?.length ?? 0;
    const usersCount = role.usersCount ?? 0;
    return `${permissionCount} صلاحية · ${usersCount} مستخدم`;
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  roleStatus(role: AdminRoleRow): string {
    return role.isActive === false ? 'غير نشط' : 'نشط';
  }

  pageInfo(): string {
    return `${this.filteredRoles().length} دور مطابق`;
  }

  itemLabel(permission: AdminPermissionItem): string {
    return permission.nameAr || permission.label;
  }

  itemSecondary(permission: AdminPermissionItem): string {
    return permission.nameEn || permission.code || permission.key;
  }

  permissionId(permission: AdminPermissionItem): string {
    return permission.permissionId || permission.id || permission.key;
  }

  canEditRoles(): boolean {
    return this.canManage();
  }

  hasPermissionControl(): boolean {
    return this.canManage();
  }

  private patchRole(role: AdminRoleRow): void {
    this.form.patchValue({
      name: role.displayName || role.name || '',
      description: role.description || ''
    });
  }

  private decorateCatalog(groups: AdminPermissionGroup[]): AdminPermissionGroup[] {
    return groups
      .map((group, groupIndex) => ({
        ...group,
        key: group.key || `group-${groupIndex}`,
        sortOrder: group.sortOrder ?? groupIndex,
        items: (group.items ?? []).map((permission, itemIndex) => ({
          ...permission,
          id: permission.id ?? permission.permissionId ?? permission.key,
          permissionId: permission.permissionId ?? permission.id ?? permission.key,
          key: permission.key || permission.code || `${group.key}-${itemIndex}`,
          label: permission.label || permission.nameAr || permission.key,
          nameAr: permission.nameAr || permission.label,
          isActive: permission.isActive ?? true,
          isMenuItem: permission.isMenuItem ?? false,
          sortOrder: permission.sortOrder ?? itemIndex,
          groupKey: permission.groupKey || group.key,
          groupLabel: permission.groupLabel || group.label,
          menuGroup: permission.menuGroup || group.label,
          route: permission.route || permission.screen || undefined
        }))
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label, 'ar'))
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label, 'ar'))
      }));
  }

  private matchesPermission(permission: AdminPermissionItem, search: string): boolean {
    return [
      permission.key,
      permission.label,
      permission.nameAr,
      permission.nameEn,
      permission.code,
      permission.controller,
      permission.action,
      permission.groupLabel,
      permission.menuGroup
    ].some((value) => this.normalize(value).includes(search));
  }

  private normalize(value: string | null | undefined): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }
}

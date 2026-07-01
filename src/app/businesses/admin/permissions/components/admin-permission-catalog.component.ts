import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ToastService } from '@app/core/services/toast.service';
import { AdminAccessService } from '../../shared/services/admin-access.service';
import { AdminPermissionGroup, AdminPermissionItem, AdminPermissionScreenResponse } from '../models/admin-permission.model';
import { AdminPermissionsService } from '../services/admin-permissions.service';
import { AdminRolesService } from '../../roles/services/admin-roles.service';
import { AdminRoleRow } from '../../roles/models/admin-role.model';

type PermissionDraft = {
  key: string;
  label: string;
  labelEn?: string;
  code?: string;
  controller?: string;
  action?: string;
  route?: string;
  groupKey: string;
  groupLabel: string;
  isMenuItem: boolean;
  isActive: boolean;
};

@Component({
  selector: 'app-admin-permission-catalog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-permission-catalog.component.html',
  styleUrl: './admin-permission-catalog.component.scss'
})
export class AdminPermissionCatalogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly permissionsService = inject(AdminPermissionsService);
  private readonly rolesService = inject(AdminRolesService);
  private readonly access = inject(AdminAccessService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly errorMessage = signal('');
  readonly catalog = signal<AdminPermissionGroup[]>([]);
  readonly roles = signal<AdminRoleRow[]>([]);
  readonly roleName = signal('');
  readonly searchText = signal('');
  readonly modalOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly editingKey = signal<string | null>(null);
  readonly deletingPermission = signal<AdminPermissionItem | null>(null);

  readonly filterForm = this.fb.nonNullable.group({
    search: ['']
  });

  readonly draftForm = this.fb.nonNullable.group({
    groupKey: ['', Validators.required],
    groupLabel: ['', Validators.required],
    key: ['', [Validators.required, Validators.minLength(2)]],
    label: ['', [Validators.required, Validators.minLength(2)]],
    labelEn: [''],
    code: [''],
    controller: [''],
    action: [''],
    route: [''],
    isMenuItem: [false],
    isActive: [true]
  });

  readonly filteredCatalog = computed(() => {
    const search = this.normalize(this.searchText());
    if (!search) return this.catalog();

    return this.catalog()
      .map((group) => ({
        ...group,
        items: group.items.filter((permission) => this.matchesPermission(permission, search))
      }))
      .filter((group) => group.items.length > 0);
  });

  readonly filteredCount = computed(() => this.filteredCatalog().flatMap((group) => group.items).length);
  readonly groupOptions = computed(() => this.catalog().map((group) => ({ key: group.key, label: group.label })));
  readonly permissionCount = computed(() => this.catalog().flatMap((group) => group.items).length);
  readonly modalTitle = computed(() => this.editingKey() ? 'تعديل صلاحية' : 'إضافة صلاحية جديدة');
  readonly canEditCatalog = computed(() => this.access.canAccess('admin.permissions.edit', 'permissions.edit', 'admin.permissions.manage'));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      roles: this.rolesService.getRoles().pipe(catchError(() => of([] as AdminRoleRow[]))),
      catalog: this.permissionsService.getCatalog(this.roleName() || undefined).pipe(catchError(() => of([] as AdminPermissionGroup[])))
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(({ roles, catalog }) => {
        this.roles.set(roles);
        this.catalog.set(this.decorateCatalog(catalog));
        this.setCurrentPageSafe();
      });
  }

  refresh(): void {
    this.load();
  }

  changeRole(roleName: string): void {
    this.roleName.set(roleName);
    this.load();
  }

  updateSearch(search: string): void {
    this.searchText.set(search);
  }

  clearSearch(): void {
    this.searchText.set('');
  }

  openCreate(): void {
    this.editingKey.set(null);
    this.errorMessage.set('');
    const firstGroup = this.groupOptions()[0];

    this.draftForm.reset({
      groupKey: firstGroup?.key ?? '',
      groupLabel: firstGroup?.label ?? '',
      key: '',
      label: '',
      labelEn: '',
      code: '',
      controller: '',
      action: '',
      route: '',
      isMenuItem: false,
      isActive: true
    });
    this.modalOpen.set(true);
  }

  openEdit(permission: AdminPermissionItem): void {
    this.editingKey.set(this.permissionId(permission));
    this.errorMessage.set('');
    this.draftForm.reset({
      groupKey: permission.groupKey,
      groupLabel: permission.groupLabel,
      key: permission.key,
      label: permission.label,
      labelEn: permission.nameEn || '',
      code: permission.code || '',
      controller: permission.controller || '',
      action: permission.action || '',
      route: permission.route || '',
      isMenuItem: permission.isMenuItem ?? false,
      isActive: permission.isActive ?? true
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.errorMessage.set('');
  }

  save(): void {
    if (this.draftForm.invalid) {
      this.draftForm.markAllAsTouched();
      return;
    }

    const raw = this.draftForm.getRawValue();
    const payload: PermissionDraft = {
      key: raw.key.trim(),
      label: raw.label.trim(),
      labelEn: raw.labelEn?.trim() || undefined,
      code: raw.code?.trim() || undefined,
      controller: raw.controller?.trim() || undefined,
      action: raw.action?.trim() || undefined,
      route: raw.route?.trim() || undefined,
      groupKey: raw.groupKey,
      groupLabel: raw.groupLabel.trim(),
      isMenuItem: raw.isMenuItem,
      isActive: raw.isActive
    };

    if (!payload.key || !payload.label || !payload.groupKey || !payload.groupLabel) {
      this.errorMessage.set('الحقول الأساسية مطلوبة.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const nextCatalog = this.applyDraft(payload);
    this.catalog.set(nextCatalog);

    this.toast.show(this.editingKey() ? 'تم تحديث الصلاحية داخل الواجهة.' : 'تمت إضافة الصلاحية داخل الواجهة.', 'success');
    this.modalOpen.set(false);
    this.saving.set(false);
  }

  askDelete(permission: AdminPermissionItem): void {
    this.deletingPermission.set(permission);
    this.deleteOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteOpen.set(false);
    this.deletingPermission.set(null);
  }

  confirmDelete(): void {
    const target = this.deletingPermission();
    if (!target) return;

    this.deleting.set(true);
    const nextCatalog = this.removePermission(target);
    this.catalog.set(nextCatalog);
    this.toast.show('تم حذف الصلاحية من الواجهة.', 'success');
    this.deleting.set(false);
    this.cancelDelete();
  }

  canEdit(): boolean {
    return this.canEditCatalog();
  }

  itemLabel(permission: AdminPermissionItem): string {
    return permission.nameAr || permission.label;
  }

  itemEnglish(permission: AdminPermissionItem): string {
    return permission.nameEn || permission.code || permission.key;
  }

  badgeClass(permission: AdminPermissionItem): string {
    return permission.isActive === false ? 'badge badge-danger' : 'badge badge-success';
  }

  permissionId(permission: AdminPermissionItem): string {
    return permission.permissionId || permission.id || permission.key;
  }

  private setCurrentPageSafe(): void {
    // No pagination here, but keep structure symmetrical with the other admin screens.
  }

  private applyDraft(draft: PermissionDraft): AdminPermissionGroup[] {
    const targetKey = this.editingKey();
    const groups = this.catalog().map((group) => ({
      ...group,
      items: [...group.items]
    }));

    if (targetKey) {
      const existing = groups.flatMap((group) => group.items).find((permission) => this.permissionId(permission) === targetKey);
      if (existing) {
        existing.key = draft.key;
        existing.label = draft.label;
        existing.nameAr = draft.label;
        existing.nameEn = draft.labelEn;
        existing.code = draft.code;
        existing.controller = draft.controller;
        existing.action = draft.action;
        existing.route = draft.route;
        existing.groupKey = draft.groupKey;
        existing.groupLabel = draft.groupLabel;
        existing.menuGroup = draft.groupLabel;
        existing.isMenuItem = draft.isMenuItem;
        existing.isActive = draft.isActive;
        return this.rebuildGroups(groups);
      }
    }

    const item: AdminPermissionItem = {
      id: draft.key,
      permissionId: draft.key,
      key: draft.key,
      label: draft.label,
      nameAr: draft.label,
      nameEn: draft.labelEn,
      code: draft.code,
      controller: draft.controller,
      action: draft.action,
      route: draft.route,
      groupKey: draft.groupKey,
      groupLabel: draft.groupLabel,
      menuGroup: draft.groupLabel,
      isMenuItem: draft.isMenuItem,
      isActive: draft.isActive
    };

    const targetGroup = groups.find((group) => group.key === draft.groupKey);
    if (targetGroup) {
      targetGroup.items = [item, ...targetGroup.items];
      return this.rebuildGroups(groups);
    }

    return this.rebuildGroups([
      ...groups,
      { key: draft.groupKey, label: draft.groupLabel, items: [item] }
    ]);
  }

  private removePermission(permission: AdminPermissionItem): AdminPermissionGroup[] {
    const targetId = this.permissionId(permission);
    const groups = this.catalog().map((group) => ({
      ...group,
      items: group.items.filter((item) => this.permissionId(item) !== targetId)
    })).filter((group) => group.items.length > 0);

    return this.rebuildGroups(groups);
  }

  private rebuildGroups(groups: AdminPermissionGroup[]): AdminPermissionGroup[] {
    return groups
      .map((group, groupIndex) => ({
        ...group,
        key: group.key || `group-${groupIndex}`,
        sortOrder: group.sortOrder ?? groupIndex,
        items: group.items
          .map((permission, itemIndex) => ({
            ...permission,
            key: permission.key || permission.code || `${group.key}-${itemIndex}`,
            id: permission.id ?? permission.permissionId ?? permission.key,
            permissionId: permission.permissionId ?? permission.id ?? permission.key,
            label: permission.label || permission.nameAr || permission.key,
            nameAr: permission.nameAr || permission.label,
            isActive: permission.isActive ?? true,
            isMenuItem: permission.isMenuItem ?? false,
            sortOrder: permission.sortOrder ?? itemIndex,
            groupKey: permission.groupKey || group.key,
            groupLabel: permission.groupLabel || group.label,
            menuGroup: permission.menuGroup || group.label
          }))
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label, 'ar'))
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label, 'ar'));
  }

  private decorateCatalog(groups: AdminPermissionGroup[]): AdminPermissionGroup[] {
    const usedGroupKeys = new Set<string>();

    return groups.map((group, groupIndex) => {
      const groupKey = this.uniqueKey(group.key || `group-${groupIndex}`, usedGroupKeys, groupIndex);
      const usedItemKeys = new Set<string>();

      return {
        ...group,
        key: groupKey,
        sortOrder: group.sortOrder ?? groupIndex,
        items: (group.items ?? []).map((permission, itemIndex) => {
          const permissionKey = this.uniqueKey(
            permission.key || permission.code || `${groupKey}-${itemIndex}`,
            usedItemKeys,
            groupIndex,
            itemIndex
          );

          return {
            ...permission,
            key: permissionKey,
            label: permission.label || permission.nameAr || permissionKey,
            nameAr: permission.nameAr || permission.label,
            isActive: permission.isActive ?? true,
            isMenuItem: permission.isMenuItem ?? false,
            sortOrder: permission.sortOrder ?? itemIndex,
            groupKey: permission.groupKey || groupKey,
            groupLabel: permission.groupLabel || group.label,
            menuGroup: permission.menuGroup || group.label
          };
        })
      };
    });
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
      permission.menuGroup,
      permission.route
    ].some((value) => this.normalize(value).includes(search));
  }

  private normalize(value: string | null | undefined): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private uniqueKey(value: string, usedKeys: Set<string>, ...parts: number[]): string {
    const base = String(value ?? '').trim().toLowerCase() || 'item';
    const suffix = parts.length ? `-${parts.join('-')}` : '';
    let candidate = `${base}${suffix}`;
    let counter = 1;

    while (usedKeys.has(candidate)) {
      candidate = `${base}${suffix}-${counter++}`;
    }

    usedKeys.add(candidate);
    return candidate;
  }
}

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { ToastService } from '@app/core/services/toast.service';
import { AdminAccessService } from '../../shared/services/admin-access.service';
import { AdminPermissionGroup, AdminPermissionItem } from '../../permissions/models/admin-permission.model';
import { AdminRolesService } from '../services/admin-roles.service';
import { AdminRoleRow } from '../models/admin-role.model';
import { AdminPermissionsService } from '../../permissions/services/admin-permissions.service';

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
  readonly errorMessage = signal('');
  readonly roles = signal<AdminRoleRow[]>([]);
  readonly catalog = signal<AdminPermissionGroup[]>([]);
  readonly selectedRoleId = signal<string | null>(null);
  readonly selectedPermissionIds = signal<string[]>([]);
  readonly currentPermissionIds = signal<string[]>([]);
  readonly rolesSearch = signal('');
  readonly permissionSearch = signal('');

  readonly filterForm = this.fb.nonNullable.group({
    search: ['']
  });

  readonly permissionFilterForm = this.fb.nonNullable.group({
    search: ['']
  });

  readonly selectedRole = computed(() => this.roles().find((role) => String(role.id) === this.selectedRoleId()) ?? null);
  readonly filteredRoles = computed(() => {
    const search = this.normalize(this.rolesSearch());
    if (!search) return this.roles();

    return this.roles().filter((role) => this.matchesSearch(role, search));
  });
  readonly filteredCatalog = computed(() => {
    const search = this.normalize(this.permissionSearch());
    const selectedRole = this.selectedRoleId();

    return this.catalog()
      .map((group) => ({
        ...group,
        items: group.items.filter((permission) => {
          if (!search) return true;
          return this.matchesPermission(permission, search);
        })
      }))
      .filter((group) => group.items.length > 0 || !search || Boolean(selectedRole));
  });

  readonly selectedCount = computed(() => this.selectedPermissionIds().length);
  readonly availableCount = computed(() => this.catalog().flatMap((group) => group.items).length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    const search = this.rolesSearch();

    forkJoin({
      roles: this.rolesService.getRoles(search).pipe(catchError(() => of([] as AdminRoleRow[]))),
      catalog: this.permissionsService.getCatalog().pipe(catchError(() => of([] as AdminPermissionGroup[])))
    }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe(({ roles, catalog }) => {
      this.roles.set(roles);
      this.catalog.set(this.decorateCatalog(catalog));

      const existing = this.selectedRoleId() ? roles.find((role) => String(role.id) === this.selectedRoleId()) : null;
      if (existing) {
        this.selectRole(existing);
        return;
      }

      if (roles.length) {
        this.selectRole(roles[0]);
      } else {
        this.selectedRoleId.set(null);
        this.selectedPermissionIds.set([]);
        this.currentPermissionIds.set([]);
      }
    });
  }

  searchRoles(): void {
    this.rolesSearch.set(this.filterForm.controls.search.value);
    this.load();
  }

  selectRole(role: AdminRoleRow): void {
    this.selectedRoleId.set(String(role.id));
    this.errorMessage.set('');
    this.permissionFilterForm.reset({ search: '' });
    this.permissionSearch.set('');
    this.currentPermissionIds.set([...(role.permissionKeys ?? [])]);

    if (role.permissionKeys?.length) {
      this.selectedPermissionIds.set([...new Set(role.permissionKeys)]);
      return;
    }

    this.rolesService.getRolePermissions(String(role.id)).pipe(
      catchError(() => of([] as string[]))
    ).subscribe((permissionIds) => {
      const ids = [...new Set(permissionIds)];
      this.currentPermissionIds.set(ids);
      this.selectedPermissionIds.set(ids);
    });
  }

  openRole(role: AdminRoleRow): void {
    this.selectRole(role);
  }

  backToList(): void {
    this.selectedRoleId.set(null);
    this.selectedPermissionIds.set([]);
    this.currentPermissionIds.set([]);
    this.permissionFilterForm.reset({ search: '' });
    this.permissionSearch.set('');
  }

  resetSelectedPermissions(): void {
    this.selectedPermissionIds.set([...this.currentPermissionIds()]);
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
      if (checked) {
        ids.forEach((id) => set.add(id));
      } else {
        ids.forEach((id) => set.delete(id));
      }
      return [...set];
    });
  }

  isSelected(permissionId: string): boolean {
    return this.selectedPermissionIds().includes(permissionId);
  }

  isGroupSelected(group: AdminPermissionGroup): boolean {
    return group.items.every((item) => this.isSelected(this.permissionId(item)));
  }

  isGroupPartial(group: AdminPermissionGroup): boolean {
    const selected = group.items.filter((item) => this.isSelected(this.permissionId(item))).length;
    return selected > 0 && selected < group.items.length;
  }

  save(): void {
    const targetId = this.selectedRoleId();
    if (!targetId) {
      this.errorMessage.set('اختر دورًا أولًا.');
      return;
    }

    this.saving.set(true);
    const permissionIds = [...new Set(this.selectedPermissionIds())];

    this.rolesService.updateRolePermissions(targetId, permissionIds).pipe(
      switchMap(() => this.access.refreshSidebar()),
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'تعذر حفظ الصلاحيات.');
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    ).subscribe((result) => {
      if (result !== null) {
        this.currentPermissionIds.set(permissionIds);
        this.toast.show('تم حفظ صلاحيات الدور بنجاح.', 'success');
        this.load();
      }
    });
  }

  roleMeta(role: AdminRoleRow): string {
    const count = role.permissionKeys?.length ?? 0;
    return `${count} صلاحية • ${role.usersCount ?? 0} مستخدم`;
  }

  permissionState(group: AdminPermissionGroup): string {
    const selected = group.items.filter((permission) => this.isSelected(this.permissionId(permission))).length;
    return `${selected}/${group.items.length}`;
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

  private decorateCatalog(groups: AdminPermissionGroup[]): AdminPermissionGroup[] {
    return groups.map((group, groupIndex) => ({
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
    }));
  }

  private matchesSearch(role: AdminRoleRow, search: string): boolean {
    return [role.name, role.displayName, role.description].some((value) => this.normalize(value).includes(search));
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
}

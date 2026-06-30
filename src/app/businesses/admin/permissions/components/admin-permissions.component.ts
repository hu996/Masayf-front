import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { AdminAccessService } from '../../shared/services/admin-access.service';
import { AdminPermissionGroup, AdminPermissionItem } from '../models/admin-permission.model';
import { AdminPermissionsService } from '../services/admin-permissions.service';
import { AdminRolesService } from '../../roles/services/admin-roles.service';
import { AdminRoleRow } from '../../roles/models/admin-role.model';

@Component({
  selector: 'app-admin-permissions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-permissions.component.html',
  styleUrl: './admin-permissions.component.scss'
})
export class AdminPermissionsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly permissionsService = inject(AdminPermissionsService);
  private readonly rolesService = inject(AdminRolesService);
  private readonly access = inject(AdminAccessService);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly catalog = signal<AdminPermissionGroup[]>([]);
  readonly roles = signal<AdminRoleRow[]>([]);
  readonly roleName = signal('');
  readonly searchText = signal('');

  readonly filterForm = this.fb.nonNullable.group({
    search: ['']
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

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      roles: this.rolesService.getRoles().pipe(catchError(() => of([] as AdminRoleRow[]))),
      catalog: this.permissionsService.getCatalog(this.roleName() || undefined).pipe(catchError(() => of([] as AdminPermissionGroup[])))
    }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe(({ roles, catalog }) => {
      this.roles.set(roles);
      this.catalog.set(this.decorateCatalog(catalog));
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

  canEditCatalog(): boolean {
    return this.access.canAccess('admin.permissions.edit', 'permissions.edit', 'admin.permissions.manage');
  }

  itemLabel(permission: AdminPermissionItem): string {
    return permission.nameAr || permission.label;
  }

  itemEnglish(permission: AdminPermissionItem): string {
    return permission.nameEn || '—';
  }

  badgeClass(permission: AdminPermissionItem): string {
    return permission.isActive === false ? 'badge badge-danger' : 'badge badge-success';
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
            groupLabel: permission.groupLabel || group.label
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

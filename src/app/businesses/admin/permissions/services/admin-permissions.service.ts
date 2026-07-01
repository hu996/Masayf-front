import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import {
  AdminPermissionCatalogResponse,
  AdminPermissionGroup,
  AdminPermissionItem,
  AdminPermissionScreenResponse,
  AdminUserPermissionSelectionPayload
} from '../models/admin-permission.model';

type AdminPermissionCatalogApiResponse =
  | AdminPermissionCatalogResponse
  | AdminPermissionGroup[]
  | AdminPermissionItem[]
  | AdminPermissionScreenResponse[]
  | { groups?: AdminPermissionGroup[]; permissions?: AdminPermissionItem[]; items?: AdminPermissionItem[] };

@Injectable({ providedIn: 'root' })
export class AdminPermissionsService {
  constructor(private readonly api: ApiService) {}

  getSidebar(): Observable<AdminPermissionGroup[]> {
    return this.api.get<AdminPermissionCatalogApiResponse>('/Admin/Permissions/Sidebar').pipe(
      map((response) => this.normalizeCatalog(response))
    );
  }

  getCatalog(roleName?: string): Observable<AdminPermissionGroup[]> {
    return this.api.get<AdminPermissionCatalogApiResponse>('/Admin/Permissions/Catalog', {
      roleName
    }).pipe(
      map((response) => this.normalizeCatalog(response))
    );
  }

  getUserPermissions(userId: string): Observable<string[]> {
    return this.api.get<{ permissionKey?: string; PermissionKey?: string }[] | { items?: Array<{ permissionKey?: string; PermissionKey?: string }> }>(`/Admin/Permissions/Users/${userId}`).pipe(
      map((response) => this.extractPermissionKeys(response))
    );
  }

  updateUserPermissions(userId: string, permissionKeys: string[]): Observable<unknown> {
    return this.api.put<unknown>(`/Admin/Permissions/Users/${userId}`, { permissionKeys } satisfies AdminUserPermissionSelectionPayload);
  }

  private normalizeCatalog(payload: AdminPermissionCatalogApiResponse): AdminPermissionGroup[] {
    if (Array.isArray(payload)) {
      if (!payload.length) {
        return [];
      }

      if (this.isPermissionGroupArray(payload)) {
        return payload;
      }

      if (this.isPermissionScreenArray(payload)) {
        return this.mapScreens(payload as AdminPermissionScreenResponse[]);
      }

      return this.groupItems(payload as AdminPermissionItem[]);
    }

    if (payload.groups?.length) {
      return payload.groups;
    }

    const items = payload.permissions ?? payload.items ?? [];
    return this.groupItems(items);
  }

  private mapScreens(screens: AdminPermissionScreenResponse[]): AdminPermissionGroup[] {
    return screens.map((screen, index) => ({
      key: this.ensureKey(screen.key, `screen-${index}`),
      label: screen.nameAr,
      sortOrder: screen.sortOrder ?? index,
      items: (screen.actions ?? []).map((action, actionIndex) => ({
        id: action.id ?? undefined,
        permissionId: action.permissionId ?? action.id ?? undefined,
        key: this.ensureKey(action.key, `${screen.key}-${actionIndex}`),
        label: action.nameAr,
        nameAr: action.nameAr,
        nameEn: action.nameEn ?? undefined,
        description: action.description ?? undefined,
        controller: action.controller ?? undefined,
        action: action.action ?? undefined,
        isMenuItem: action.isMenuItem ?? undefined,
        isActive: action.isActive ?? undefined,
        route: action.route ?? undefined,
        groupKey: screen.key,
        groupLabel: screen.nameAr,
        screen: screen.key,
        sortOrder: actionIndex
      }))
    }));
  }

  private groupItems(items: AdminPermissionItem[]): AdminPermissionGroup[] {
    const groups = new Map<string, AdminPermissionGroup>();

    items.forEach((item, index) => {
      const key = this.ensureKey(item.groupKey || item.screen, `general-${index}`);
      const label = item.groupLabel || item.screen || 'General';

      if (!groups.has(key)) {
        groups.set(key, { key, label, items: [] });
      }

      const safeItem = {
        ...item,
        key: this.ensureKey(item.key, `${key}-${index}`),
        groupKey: key,
        groupLabel: label
      };

      groups.get(key)!.items.push(safeItem);
    });

    return [...groups.values()]
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label, 'ar'))
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label, 'ar'));
  }

  private isPermissionGroupArray(value: unknown[]): value is AdminPermissionGroup[] {
    return Boolean(value.length) && typeof value[0] === 'object' && value[0] !== null && 'items' in value[0];
  }

  private isPermissionScreenArray(value: unknown[]): value is AdminPermissionScreenResponse[] {
    return Boolean(value.length) && typeof value[0] === 'object' && value[0] !== null && 'actions' in value[0];
  }

  private extractPermissionKeys(response: { permissionKey?: string; PermissionKey?: string }[] | { items?: Array<{ permissionKey?: string; PermissionKey?: string }> }): string[] {
    const items = Array.isArray(response) ? response : response.items ?? [];
    return items
      .map((item) => item.permissionKey ?? item.PermissionKey ?? '')
      .filter((key) => Boolean(key));
  }

  private ensureKey(value: string | null | undefined, fallback: string): string {
    const text = String(value ?? '').trim();
    if (!text || text === '0' || text.toLowerCase() === 'nan') {
      return fallback;
    }
    return text;
  }
}

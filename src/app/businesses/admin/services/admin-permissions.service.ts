import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import {
  AdminPermissionCatalogResponse,
  AdminPermissionGroup,
  AdminPermissionItem,
  AdminPermissionScreenResponse,
  AdminPermissionSelectionPayload
} from '../models/admin-permission.model';

@Injectable({ providedIn: 'root' })
export class AdminPermissionsService {
  constructor(private readonly api: ApiService) {}

  getCatalog(): Observable<AdminPermissionGroup[]> {
    return this.api.get<AdminPermissionCatalogResponse | AdminPermissionGroup[] | AdminPermissionItem[] | AdminPermissionScreenResponse[]>('/Admin/Permissions/Catalog').pipe(
      map((response) => this.normalizeCatalog(response))
    );
  }

  getUserPermissions(userId: string): Observable<string[]> {
    return this.api.get<string[]>(`/Admin/Permissions/Users/${userId}`);
  }

  updateUserPermissions(userId: string, permissionKeys: string[]): Observable<unknown> {
    return this.api.put<unknown>(`/Admin/Permissions/Users/${userId}`, { permissionKeys } satisfies AdminPermissionSelectionPayload);
  }

  private normalizeCatalog(
    response: AdminPermissionCatalogResponse | AdminPermissionGroup[] | AdminPermissionItem[] | AdminPermissionScreenResponse[]
  ): AdminPermissionGroup[] {
    if (Array.isArray(response)) {
      if (response.length && 'items' in response[0]) {
        return response as AdminPermissionGroup[];
      }

      if (response.length && 'actions' in response[0]) {
        return this.mapScreens(response as AdminPermissionScreenResponse[]);
      }

      return this.groupItems(response as AdminPermissionItem[]);
    }

    if (response.groups?.length) {
      return response.groups;
    }

    const items = response.permissions ?? response.items ?? [];
    return this.groupItems(items);
  }

  private mapScreens(screens: AdminPermissionScreenResponse[]): AdminPermissionGroup[] {
    return screens.map((screen) => ({
      key: screen.key,
      label: screen.nameAr,
      items: (screen.actions ?? []).map((action) => ({
        key: action.key,
        label: action.nameAr,
        description: action.description ?? undefined,
        groupKey: screen.key,
        groupLabel: screen.nameAr,
        screen: screen.key
      }))
    }));
  }

  private groupItems(items: AdminPermissionItem[]): AdminPermissionGroup[] {
    const groups = new Map<string, AdminPermissionGroup>();

    for (const item of items) {
      const key = item.groupKey || item.screen || 'general';
      const label = item.groupLabel || item.screen || 'General';

      if (!groups.has(key)) {
        groups.set(key, { key, label, items: [] });
      }

      groups.get(key)!.items.push(item);
    }

    return [...groups.values()].map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.label.localeCompare(b.label))
    }));
  }
}

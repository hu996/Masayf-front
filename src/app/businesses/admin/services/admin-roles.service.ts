import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { AdminRoleFormValue, AdminRoleRow } from '../models/admin-role.model';
import { AdminPermissionSelectionPayload } from '../models/admin-permission.model';

@Injectable({ providedIn: 'root' })
export class AdminRolesService {
  constructor(private readonly api: ApiService) {}

  getRoles(search = ''): Observable<AdminRoleRow[]> {
    return this.api.get<AdminRoleRow[]>('/Admin/Roles', { search });
  }

  createRole(body: AdminRoleFormValue): Observable<AdminRoleRow> {
    return this.api.post<AdminRoleRow>('/Admin/Roles', body);
  }

  updateRole(id: string, body: AdminRoleFormValue): Observable<AdminRoleRow> {
    return this.api.put<AdminRoleRow>(`/Admin/Roles/${id}`, body);
  }

  deleteRole(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`/Admin/Roles/${id}`);
  }

  getRolePermissions(id: string): Observable<string[]> {
    return this.api.get<string[]>(`/Admin/Roles/${id}/Permissions`);
  }

  updateRolePermissions(id: string, permissionKeys: string[]): Observable<unknown> {
    return this.api.put<unknown>(`/Admin/Roles/${id}/Permissions`, { permissionKeys } satisfies AdminPermissionSelectionPayload);
  }
}

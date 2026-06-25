import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { AdminUserFormValue, AdminUserRow } from '../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  constructor(private readonly api: ApiService) {}

  getUsers(search = ''): Observable<AdminUserRow[]> {
    return this.api.get<AdminUserRow[]>('/Admin/Users', { search });
  }

  createUser(body: AdminUserFormValue): Observable<AdminUserRow> {
    return this.api.post<AdminUserRow>('/Admin/Users', body);
  }

  updateUser(id: string, body: AdminUserFormValue): Observable<AdminUserRow> {
    return this.api.put<AdminUserRow>(`/Admin/Users/${id}`, body);
  }

  toggleActive(id: string): Observable<AdminUserRow> {
    return this.api.post<AdminUserRow>(`/Admin/Users/${id}/ToggleActive`, {});
  }
}

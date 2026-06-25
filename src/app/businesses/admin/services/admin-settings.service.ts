import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { AdminSettingFormValue, AdminSettingRow } from '../models/admin-setting.model';

@Injectable({ providedIn: 'root' })
export class AdminSettingsService {
  constructor(private readonly api: ApiService) {}

  getSettings(group = ''): Observable<AdminSettingRow[]> {
    return this.api.get<AdminSettingRow[]>('/Admin/Settings', { group });
  }

  createSetting(body: AdminSettingFormValue): Observable<AdminSettingRow> {
    return this.api.post<AdminSettingRow>('/Admin/Settings', body);
  }

  updateSetting(id: string, body: AdminSettingFormValue): Observable<AdminSettingRow> {
    return this.api.put<AdminSettingRow>(`/Admin/Settings/${id}`, body);
  }

  deleteSetting(id: string): Observable<void> {
    return this.api.delete<void>(`/Admin/Settings/${id}`);
  }
}

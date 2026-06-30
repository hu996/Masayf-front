import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { AdminPriceProfileFormValue, AdminPriceProfileRow } from '../models/admin-price-profile.model';

@Injectable({ providedIn: 'root' })
export class AdminPriceProfilesService {
  constructor(private readonly api: ApiService) {}

  getProfiles(cityId?: string | null): Observable<AdminPriceProfileRow[]> {
    return this.api.get<AdminPriceProfileRow[]>('/Admin/PriceProfiles', cityId ? { cityId } : undefined);
  }

  createProfile(body: AdminPriceProfileFormValue): Observable<unknown> {
    return this.api.post<unknown>('/Admin/PriceProfiles', body);
  }

  updateProfile(id: string, body: AdminPriceProfileFormValue): Observable<unknown> {
    return this.api.put<unknown>(`/Admin/PriceProfiles/${id}`, body);
  }
}

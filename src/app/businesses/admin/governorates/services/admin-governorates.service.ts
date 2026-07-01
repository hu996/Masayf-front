import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { AdminGovernorateFormValue, AdminGovernorateRow } from '../models/admin-governorate.model';

@Injectable({ providedIn: 'root' })
export class AdminGovernoratesService {
  constructor(private readonly api: ApiService) {}

  getGovernorates(): Observable<AdminGovernorateRow[]> {
    return this.api.get<AdminGovernorateRow[]>('/Cities/GetGovernorates');
  }

  addGovernorate(body: AdminGovernorateFormValue): Observable<AdminGovernorateRow> {
    return this.api.post<AdminGovernorateRow>('/Cities/AddGovernorate', body);
  }
}


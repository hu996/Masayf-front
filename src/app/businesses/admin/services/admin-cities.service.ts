import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { AdminCityRow } from '../models/admin-city.model';
import { City } from '@app/core/models/api.models';

@Injectable({ providedIn: 'root' })
export class AdminCitiesService {
  constructor(private readonly api: ApiService) {}

  getCities(): Observable<AdminCityRow[]> {
    return this.api.get<AdminCityRow[]>('/Admin/Cities');
  }

  createCity(body: Partial<City>): Observable<AdminCityRow> {
    return this.api.post<AdminCityRow>('/Admin/Cities', body);
  }

  updateCity(id: string, body: Partial<City>): Observable<AdminCityRow> {
    return this.api.put<AdminCityRow>(`/Admin/Cities/${id}`, body);
  }

  toggleActive(id: string): Observable<AdminCityRow> {
    return this.api.post<AdminCityRow>(`/Admin/Cities/${id}/ToggleActive`, {});
  }
}

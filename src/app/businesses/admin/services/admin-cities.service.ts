import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { AdminCityFormValue, AdminCityRow } from '../models/admin-city.model';

@Injectable({ providedIn: 'root' })
export class AdminCitiesService {
  constructor(private readonly api: ApiService) {}

  getCities(): Observable<AdminCityRow[]> {
    return this.api.get<AdminCityRow[]>('/Admin/Cities');
  }

  createCity(body: AdminCityFormValue): Observable<AdminCityRow> {
    return this.api.post<AdminCityRow>('/Admin/Cities', body);
  }

  updateCity(id: string, body: AdminCityFormValue): Observable<AdminCityRow> {
    return this.api.put<AdminCityRow>(`/Admin/Cities/${id}`, body);
  }

  deleteCity(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`/Admin/Cities/${id}`);
  }
}

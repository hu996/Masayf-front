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
    return this.api.post<AdminCityRow>('/Admin/Cities', this.buildFormData(body));
  }

  updateCity(id: string, body: AdminCityFormValue): Observable<AdminCityRow> {
    return this.api.put<AdminCityRow>(`/Admin/Cities/${id}`, this.toUpdatePayload(body));
  }

  deleteCity(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`/Admin/Cities/${id}`);
  }

  private buildFormData(body: AdminCityFormValue): FormData {
    const formData = new FormData();
    formData.append('GovernorateId', String(body.governorateId ?? ''));
    formData.append('Name', body.name);
    formData.append('Description', body.description ?? '');
    formData.append('SuitableForFamilies', String(body.suitableForFamilies));
    formData.append('SuitableForYouth', String(body.suitableForYouth));
    formData.append('SuitableForKids', String(body.suitableForKids));
    formData.append('CrowdLevel', String(body.crowdLevel ?? 0));
    formData.append('PriceLevel', String(body.priceLevel ?? 0));
    formData.append('IsActive', String(body.isActive));

    if (body.mainImageIndex !== null && body.mainImageIndex !== undefined) {
      formData.append('MainImageIndex', String(body.mainImageIndex));
    }

    (body.photos ?? []).forEach((photo) => formData.append('Photos', photo, photo.name));
    return formData;
  }

  private toUpdatePayload(body: AdminCityFormValue): Omit<AdminCityFormValue, 'photos' | 'mainImageIndex'> {
    const { photos: _photos, mainImageIndex: _mainImageIndex, ...payload } = body;
    return payload;
  }
}

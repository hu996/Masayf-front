import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { AdminPlaceFormValue, AdminPlaceRow } from '../models/admin-place.model';
import { MediaImage } from '@app/core/models/api.models';

@Injectable({ providedIn: 'root' })
export class AdminPlacesService {
  constructor(private readonly api: ApiService) {}

  getPlaces(): Observable<AdminPlaceRow[]> {
    return this.api.get<AdminPlaceRow[]>('/Admin/Places');
  }

  createPlace(body: AdminPlaceFormValue): Observable<AdminPlaceRow> {
    return this.api.post<AdminPlaceRow>('/Admin/Places', body);
  }

  updatePlace(id: string, body: AdminPlaceFormValue): Observable<AdminPlaceRow> {
    return this.api.put<AdminPlaceRow>(`/Admin/Places/${id}`, body);
  }

  deletePlace(id: string): Observable<void> {
    return this.api.delete<void>(`/Admin/Places/${id}`);
  }

  getImages(id: string): Observable<MediaImage[]> {
    return this.api.get<MediaImage[]>(`/Admin/Places/${id}/Images`);
  }

  uploadImages(id: string, files: File[], mainImageIndex: number | null = null): Observable<MediaImage[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (mainImageIndex !== null) {
      formData.append('mainImageIndex', String(mainImageIndex));
    }
    return this.api.post<MediaImage[]>(`/Admin/Places/${id}/Images`, formData);
  }

  updateImage(placeId: string, imageId: string, body: Partial<MediaImage>): Observable<MediaImage> {
    return this.api.put<MediaImage>(`/Admin/Places/${placeId}/Images/${imageId}`, body);
  }

  reorderImages(placeId: string, imageIds: string[]): Observable<MediaImage[]> {
    return this.api.put<MediaImage[]>(`/Admin/Places/${placeId}/Images/Reorder`, { imageIds });
  }

  deleteImage(placeId: string, imageId: string): Observable<void> {
    return this.api.delete<void>(`/Admin/Places/${placeId}/Images/${imageId}`);
  }
}

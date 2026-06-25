import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiId, Place } from '@app/core/models/api.models';
import { ApiService } from '@app/core/services/api.service';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  constructor(private readonly api: ApiService) {}

  getFavorites(): Observable<Place[]> {
    return this.api.get<Place[]>('/Favorites');
  }

  add(placeId: ApiId): Observable<unknown> {
    return this.api.post<unknown>(`/Favorites/${placeId}`);
  }

  remove(placeId: ApiId): Observable<unknown> {
    return this.api.delete<unknown>(`/Favorites/${placeId}`);
  }
}


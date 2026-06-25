import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiId, PagedResult, Place } from '@app/core/models/api.models';
import { ApiService } from '@app/core/services/api.service';

export interface AccommodationFilters extends Record<string, string | number | boolean | null | undefined> {
  cityId?: ApiId;
  areaId?: ApiId;
  minPrice?: number;
  maxPrice?: number;
  personsCount?: number;
  pageNumber?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class AccommodationsService {
  constructor(private readonly api: ApiService) {}

  search(filters: AccommodationFilters): Observable<Place[] | PagedResult<Place>> {
    return this.api.get<Place[] | PagedResult<Place>>('/Accommodations/Search', {
      CityId: filters.cityId,
      AreaId: filters.areaId,
      MinPrice: filters.minPrice,
      MaxPrice: filters.maxPrice,
      MinCapacity: filters.personsCount,
      PageNumber: filters.pageNumber,
      PageSize: filters.pageSize
    });
  }

  details(id: ApiId): Observable<Place> {
    return this.api.get<Place>(`/Accommodations/Details/${id}`);
  }
}


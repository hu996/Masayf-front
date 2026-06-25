import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiId, PagedResult, Place } from '../models/api.models';
import { ApiService } from './api.service';

export interface AttractionFilters extends Record<string, string | number | boolean | null | undefined> {
  cityId?: ApiId;
  areaId?: ApiId;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  pageNumber?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class AttractionsService {
  constructor(private readonly api: ApiService) {}

  search(filters: AttractionFilters): Observable<Place[] | PagedResult<Place>> {
    return this.api.get<Place[] | PagedResult<Place>>('/Attractions/Search', {
      CityId: filters.cityId,
      AreaId: filters.areaId,
      // PlaceSearchRequest has no Category property. The API searches category,
      // name, and description through SearchTerm instead.
      SearchTerm: filters.category,
      MinPrice: filters.minPrice,
      MaxPrice: filters.maxPrice,
      PageNumber: filters.pageNumber,
      PageSize: filters.pageSize
    });
  }

  details(id: ApiId): Observable<Place> {
    return this.api.get<Place>(`/Attractions/Details/${id}`);
  }
}

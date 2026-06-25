import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ApiId, Area, City, PagedResult } from '@app/core/models/api.models';
import { ApiService } from '@app/core/services/api.service';

@Injectable({ providedIn: 'root' })
export class CitiesService {
  private citiesCache$?: Observable<City[] | PagedResult<City>>;

  constructor(private readonly api: ApiService) {}

  getCities(): Observable<City[] | PagedResult<City>> {
    this.citiesCache$ ??= this.api.get<City[] | PagedResult<City>>('/Cities/GetCities').pipe(shareReplay(1));
    return this.citiesCache$;
  }

  getGovernorates(): Observable<Array<{ id: ApiId; name: string }>> {
    return this.api.get<Array<{ id: ApiId; name: string }>>('/Cities/GetGovernorates');
  }

  clearCache(): void {
    this.citiesCache$ = undefined;
  }

  getCityById(id: ApiId): Observable<City> {
    return this.api.get<City>(`/Cities/GetCityById/${id}`);
  }

  searchCities(query = '', pageNumber = 1, pageSize = 9): Observable<City[] | PagedResult<City>> {
    return this.api.get<City[] | PagedResult<City>>('/Cities/SearchCities', { SearchTerm: query, PageNumber: pageNumber, PageSize: pageSize });
  }

  getAreasByCity(cityId: ApiId): Observable<Area[]> {
    return this.api.get<Area[]>(`/Cities/GetAreasByCity/${cityId}`);
  }
}

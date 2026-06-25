import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import {
  LookupItemFormValue,
  LookupItemRow,
  LookupTypeFormValue,
  LookupTypeRow,
  PagedResult
} from '../models/admin-lookup.model';

export interface LookupTypesQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean | null;
  isSystem?: boolean | null;
}

export interface LookupItemsQuery {
  pageNumber?: number;
  pageSize?: number;
  lookupTypeId?: string | null;
  lookupTypeCode?: string | null;
  isActive?: boolean | null;
  isSystem?: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class AdminLookupsService {
  constructor(private readonly api: ApiService) {}

  getTypes(query: LookupTypesQuery): Observable<PagedResult<LookupTypeRow>> {
    return this.api.get<PagedResult<LookupTypeRow>>('/Admin/Lookups/Types', query as Record<string, unknown>);
  }

  getType(id: string): Observable<LookupTypeRow> {
    return this.api.get<LookupTypeRow>(`/Admin/Lookups/Types/${id}`);
  }

  createType(body: LookupTypeFormValue): Observable<LookupTypeRow> {
    return this.api.post<LookupTypeRow>('/Admin/Lookups/Types', body);
  }

  updateType(id: string, body: LookupTypeFormValue): Observable<LookupTypeRow> {
    return this.api.put<LookupTypeRow>(`/Admin/Lookups/Types/${id}`, body);
  }

  deleteType(id: string): Observable<void> {
    return this.api.delete<void>(`/Admin/Lookups/Types/${id}`);
  }

  getItems(query: LookupItemsQuery): Observable<PagedResult<LookupItemRow>> {
    return this.api.get<PagedResult<LookupItemRow>>('/Admin/Lookups/Items', query as Record<string, unknown>);
  }

  getItem(id: string): Observable<LookupItemRow> {
    return this.api.get<LookupItemRow>(`/Admin/Lookups/Items/${id}`);
  }

  createItem(body: LookupItemFormValue & { isSystem?: boolean }): Observable<LookupItemRow> {
    return this.api.post<LookupItemRow>('/Admin/Lookups/Items', body);
  }

  updateItem(id: string, body: LookupItemFormValue): Observable<LookupItemRow> {
    return this.api.put<LookupItemRow>(`/Admin/Lookups/Items/${id}`, body);
  }

  deleteItem(id: string): Observable<void> {
    return this.api.delete<void>(`/Admin/Lookups/Items/${id}`);
  }
}


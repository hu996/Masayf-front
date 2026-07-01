import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  AdminAnalyticsOverview,
  AdminPageViewFilters,
  AdminPageViewsResult,
  TrackPageViewRequest,
  TrackPageViewResponse,
  normalizeAdminAnalyticsOverview,
  normalizeAdminPageViewsResult,
  normalizeTrackPageViewResponse
} from '../models/analytics.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private readonly api: ApiService) {}

  trackPageView(payload: TrackPageViewRequest): Observable<TrackPageViewResponse> {
    return this.api.post<unknown>('/Analytics/PageViews', payload).pipe(
      map((value) => normalizeTrackPageViewResponse(value))
    );
  }

  getOverview(fromDate?: string | null, toDate?: string | null): Observable<AdminAnalyticsOverview> {
    return this.api.get<unknown>('/Admin/Analytics/Overview', { fromDate, toDate }).pipe(
      map((value) => normalizeAdminAnalyticsOverview(value))
    );
  }

  getPageViews(filters: AdminPageViewFilters = {}): Observable<AdminPageViewsResult> {
    return this.api.get<unknown>('/Admin/Analytics/PageViews', {
      search: filters.search,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      pageNumber: filters.pageNumber ?? 1,
      pageSize: filters.pageSize ?? 12
    }).pipe(
      map((value) => normalizeAdminPageViewsResult(value))
    );
  }
}

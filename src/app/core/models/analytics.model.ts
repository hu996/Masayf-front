import { ApiId, normalizeId } from './api-id.model';

export interface TrackPageViewRequest {
  pageKey: string;
  pageTitle?: string | null;
  path?: string | null;
  referrer?: string | null;
  visitorKey?: string | null;
}

export interface TrackPageViewResponse {
  id?: ApiId;
  visitorKey: string;
}

export interface AdminAnalyticsOverview {
  totalPageViews: number;
  uniqueVisitors: number;
  todayPageViews: number;
  todayUniqueVisitors: number;
  topPages: AdminTopPage[];
  dailyTraffic: AdminDailyTraffic[];
}

export interface AdminTopPage {
  pageKey: string;
  pageTitle?: string | null;
  path?: string | null;
  views: number;
  uniqueVisitors: number;
  lastViewedAt: string;
}

export interface AdminDailyTraffic {
  day: string;
  pageViews: number;
  uniqueVisitors: number;
}

export interface AdminPageViewRow {
  id: ApiId;
  visitorKey: string;
  pageKey: string;
  pageTitle?: string | null;
  path?: string | null;
  referrer?: string | null;
  userName?: string | null;
  createdAt: string;
}

export interface AdminPageViewsResult {
  items: AdminPageViewRow[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface AdminPageViewFilters {
  search?: string;
  fromDate?: string | null;
  toDate?: string | null;
  pageNumber?: number;
  pageSize?: number;
}

export function normalizeTrackPageViewResponse(raw: unknown): TrackPageViewResponse {
  const value = asRecord(raw);
  return {
    id: normalizeId(value['id'] ?? value['trackingId'] ?? value['pageViewId']) ?? undefined,
    visitorKey: pickText(value, ['visitorKey', 'VisitorKey']) || ''
  };
}

export function normalizeAdminAnalyticsOverview(raw: unknown): AdminAnalyticsOverview {
  const value = asRecord(raw);
  return {
    totalPageViews: pickNumber(value, ['totalPageViews', 'TotalPageViews', 'totalViews', 'TotalViews', 'pageViews', 'PageViews', 'total', 'Total'], 0),
    uniqueVisitors: pickNumber(value, ['uniqueVisitors', 'UniqueVisitors', 'uniqueVisitorCount', 'UniqueVisitorCount'], 0),
    todayPageViews: pickNumber(value, ['todayPageViews', 'TodayPageViews', 'todayViews', 'TodayViews'], 0),
    todayUniqueVisitors: pickNumber(value, ['todayUniqueVisitors', 'TodayUniqueVisitors', 'todayUniqueVisitorCount', 'TodayUniqueVisitorCount'], 0),
    topPages: extractArray(value, ['topPages', 'TopPages', 'pages', 'Pages', 'topPagesStats', 'TopPagesStats']).map((item) => normalizeAdminTopPage(item)),
    dailyTraffic: extractArray(value, ['dailyTraffic', 'DailyTraffic', 'traffic', 'Traffic', 'daily', 'Daily']).map((item) => normalizeAdminDailyTraffic(item))
  };
}

export function normalizeAdminPageViewsResult(raw: unknown): AdminPageViewsResult {
  const value = asRecord(raw);
  const items = extractArray(value, ['items', 'data', 'results', 'pageViews']).map((item) => normalizeAdminPageViewRow(item));

  return {
    items,
    totalCount: pickNumber(value, ['totalCount', 'TotalCount', 'count', 'Count', 'total', 'Total'], items.length),
    pageNumber: pickNumber(value, ['pageNumber', 'PageNumber', 'page', 'Page', 'currentPage', 'CurrentPage'], 1),
    pageSize: pickNumber(value, ['pageSize', 'PageSize', 'size', 'Size', 'pageLimit', 'PageLimit'], 10)
  };
}

function normalizeAdminTopPage(raw: unknown): AdminTopPage {
  const value = asRecord(raw);
  return {
    pageKey: pickText(value, ['pageKey', 'PageKey', 'key', 'Key', 'page', 'Page']) || '',
    pageTitle: pickText(value, ['pageTitle', 'PageTitle', 'title', 'Title', 'pageName', 'PageName']) || null,
    path: pickText(value, ['path', 'Path', 'url', 'Url', 'route', 'Route']) || null,
    views: pickNumber(value, ['views', 'Views', 'pageViews', 'PageViews', 'count', 'Count'], 0),
    uniqueVisitors: pickNumber(value, ['uniqueVisitors', 'UniqueVisitors', 'uniqueVisitorCount', 'UniqueVisitorCount'], 0),
    lastViewedAt: pickText(value, ['lastViewedAt', 'LastViewedAt', 'lastVisitAt', 'LastVisitAt', 'updatedAt', 'UpdatedAt']) || new Date().toISOString()
  };
}

function normalizeAdminDailyTraffic(raw: unknown): AdminDailyTraffic {
  const value = asRecord(raw);
  return {
    day: pickText(value, ['day', 'Day', 'date', 'Date']) || new Date().toISOString(),
    pageViews: pickNumber(value, ['pageViews', 'PageViews', 'views', 'Views', 'count', 'Count'], 0),
    uniqueVisitors: pickNumber(value, ['uniqueVisitors', 'UniqueVisitors', 'uniqueVisitorCount', 'UniqueVisitorCount'], 0)
  };
}

function normalizeAdminPageViewRow(raw: unknown): AdminPageViewRow {
  const value = asRecord(raw);
  return {
    id: normalizeId(value['id'] ?? value['Id'] ?? value['pageViewId'] ?? value['PageViewId'] ?? value['trackingId'] ?? value['TrackingId']) ?? '',
    visitorKey: pickText(value, ['visitorKey', 'VisitorKey']) || '',
    pageKey: pickText(value, ['pageKey', 'PageKey', 'page']) || '',
    pageTitle: pickText(value, ['pageTitle', 'PageTitle', 'title', 'Title']) || null,
    path: pickText(value, ['path', 'Path', 'url', 'Url']) || null,
    referrer: pickText(value, ['referrer', 'Referrer', 'referer', 'Referer']) || null,
    userName: pickText(value, ['userName', 'UserName', 'fullName', 'FullName']) || null,
    createdAt: pickText(value, ['createdAt', 'CreatedAt', 'dateCreated', 'DateCreated', 'viewedAt', 'ViewedAt']) || new Date().toISOString()
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function pickText(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function pickNumber(source: Record<string, unknown>, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
}

function extractArray(source: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

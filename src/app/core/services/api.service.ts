import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { map, Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

type Params = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly serverBaseUrl = (environment.backendBaseUrl || '').replace(/\/$/, '');
  private readonly getCache = new Map<string, { expiresAt: number; value: Observable<unknown> }>();
  private readonly cacheTtlMs = 60_000;

  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, params?: Params): Observable<T> {
    const url = this.url(path);
    const cleanParams = this.cleanParams(params);
    const cacheKey = `${url}?${JSON.stringify(cleanParams)}`;
    const cached = this.getCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as Observable<T>;
    }

    const value = this.http.get<ApiResponse<T> | T>(url, { params: this.toParams(cleanParams) }).pipe(
      map((response) => this.unwrap(response)),
      shareReplay(1)
    );
    this.getCache.set(cacheKey, { expiresAt: Date.now() + this.cacheTtlMs, value });
    return value;
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<ApiResponse<T> | T>(this.url(path), body).pipe(
      map((response) => this.unwrap(response)),
      tap(() => this.getCache.clear())
    );
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.http.put<ApiResponse<T> | T>(this.url(path), body).pipe(
      map((response) => this.unwrap(response)),
      tap(() => this.getCache.clear())
    );
  }

  delete<T>(path: string, params?: Params): Observable<T> {
    return this.http.delete<ApiResponse<T> | T>(this.url(path), { params: this.toParams(params) }).pipe(
      map((response) => this.unwrap(response)),
      tap(() => this.getCache.clear())
    );
  }

  private url(path: string): string {
    const normalizedPath = path.replace(/^\//, '');

    if (/(^|[/?=&])NaN($|[/?=&])/i.test(normalizedPath)) {
      throw new Error('رابط الطلب غير صحيح: لا يمكن إرسال قيمة غير رقمية.');
    }

    const baseUrl = isPlatformBrowser(this.platformId) ? this.baseUrl : (this.serverBaseUrl || this.baseUrl);
    return `${baseUrl}/${normalizedPath}`;
  }

  private unwrap<T>(response: ApiResponse<T> | T): T {
    if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
      const wrapped = response as ApiResponse<T>;

      if (!wrapped.success) {
        const errors = wrapped.errors?.length ? ` ${wrapped.errors.join(' - ')}` : '';
        throw new Error(`${wrapped.message || 'تعذر تنفيذ الطلب.'}${errors}`);
      }

      return wrapped.data;
    }

    return response as T;
  }

  private toParams(params?: Params): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(this.cleanParams(params)).forEach(([key, value]) => {
      httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }

  private cleanParams(params?: Params): Params {
    const clean: Params = {};
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '' && !(typeof value === 'number' && Number.isNaN(value))) {
        const text = String(value);

        if (text.toLowerCase() !== 'nan') {
          clean[key] = value;
        }
      }
    });
    return clean;
  }
}

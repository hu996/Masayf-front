import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { ApiId, normalizeId } from '../models/api.models';
import { ApiService } from './api.service';

interface SavedDestinationDto {
  id: ApiId;
  cityId: ApiId;
  cityName: string;
  imageUrl?: string | null;
  createdAt: string;
}

export interface SavedDestination extends SavedDestinationDto {
  totalCost: number;
  remainingBudget: number;
  savedAt: string;
}

export interface SavedDestinationInput {
  cityId: ApiId;
  cityName: string;
  imageUrl?: string | null;
  totalCost?: number;
  remainingBudget?: number;
}

@Injectable({ providedIn: 'root' })
export class SavedDestinationsService {
  private readonly clientStorageKey = 'masayef_client_id';
  private readonly items = signal<SavedDestination[]>([]);

  constructor(
    private readonly api: ApiService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  getAll(): SavedDestination[] {
    return this.items();
  }

  load(): Observable<SavedDestination[]> {
    return this.api.get<SavedDestinationDto[]>('/SavedDestinations', { clientId: this.clientId() }).pipe(
      map((items) => (items ?? []).map((item) => this.normalize(item))),
      tap((items) => this.items.set(items))
    );
  }

  save(item: SavedDestinationInput): Observable<boolean> {
    const cityId = normalizeId(item.cityId);
    if (!cityId) {
      throw new Error('لا يمكن حفظ مدينة بدون cityId صحيح.');
    }

    return this.api.post<boolean>(`/SavedDestinations/${cityId}`, { clientId: this.clientId() }).pipe(
      tap(() => {
        const destination: SavedDestination = {
          id: cityId,
          cityId,
          cityName: item.cityName,
          imageUrl: item.imageUrl,
          createdAt: new Date().toISOString(),
          savedAt: new Date().toISOString(),
          totalCost: Number(item.totalCost ?? 0),
          remainingBudget: Number(item.remainingBudget ?? 0)
        };
        this.items.update((items) => [destination, ...items.filter((saved) => saved.cityId !== cityId)]);
      })
    );
  }

  remove(cityId: ApiId): Observable<boolean> {
    const id = normalizeId(cityId);
    if (!id) {
      throw new Error('لا يمكن حذف مدينة بدون cityId صحيح.');
    }

    return this.api.delete<boolean>(`/SavedDestinations/${id}`, { clientId: this.clientId() }).pipe(
      tap(() => this.items.update((items) => items.filter((item) => item.cityId !== id)))
    );
  }

  isSaved(cityId: ApiId | null | undefined): boolean {
    const id = normalizeId(cityId);
    return Boolean(id && this.items().some((item) => item.cityId === id));
  }

  private normalize(item: SavedDestinationDto): SavedDestination {
    return {
      ...item,
      totalCost: 0,
      remainingBudget: 0,
      savedAt: item.createdAt
    };
  }

  private clientId(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const existing = localStorage.getItem(this.clientStorageKey);
    if (existing) return existing;
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(this.clientStorageKey, id);
    return id;
  }
}

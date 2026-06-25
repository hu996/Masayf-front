import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ApiId } from '@app/core/models/api-id.model';
import { TripPlanResponse, TripScenarioItem } from '@app/core/models/trip-planner.model';

export interface SavedTripPlan extends TripPlanResponse {
  savedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SavedTripPlansService {
  private readonly storageKey = 'masayef_saved_trip_plans';

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  getAll(): SavedTripPlan[] {
    if (!this.isBrowser()) {
      return [];
    }

    try {
      const items = JSON.parse(localStorage.getItem(this.storageKey) || '[]') as SavedTripPlan[];
      return Array.isArray(items) ? items.filter((item) => item.tripPlanId) : [];
    } catch {
      return [];
    }
  }

  save(plan: TripPlanResponse): SavedTripPlan {
    const savedPlan: SavedTripPlan = {
      ...plan,
      tripPlanId: plan.tripPlanId || this.createId(),
      savedAt: new Date().toISOString()
    };

    if (this.isBrowser()) {
      const current = this.getAll().filter((item) => item.tripPlanId !== savedPlan.tripPlanId);
      localStorage.setItem(this.storageKey, JSON.stringify([savedPlan, ...current]));
    }

    return savedPlan;
  }

  addDraftItem(item: TripScenarioItem & { cityId?: ApiId | null; cityName?: string; budget?: number }): SavedTripPlan {
    const draftId = `draft-${item.cityId || 'general'}`;
    const current = this.getAll().find((plan) => plan.tripPlanId === draftId);
    const items = current?.scenarios?.[0]?.items ?? [];
    const nextItems = [item, ...items.filter((entry) => entry.placeId !== item.placeId)];
    const totalCost = nextItems.reduce((total, entry) => total + Number(entry.estimatedCost ?? 0), 0);
    const budget = Number(item.budget ?? current?.budget ?? totalCost);
    const plan: TripPlanResponse = {
      tripPlanId: draftId,
      cityName: item.cityName || current?.cityName || 'خطة مسودة',
      budget,
      scenarios: [
        {
          scenarioType: 'Draft',
          accommodationCost: item.itemType === 'accommodation' ? totalCost : 0,
          foodCost: 0,
          transportationCost: 0,
          attractionsCost: item.itemType === 'attraction' ? totalCost : 0,
          totalCost,
          remainingBudget: budget - totalCost,
          isOverBudget: budget < totalCost,
          warningMessage: budget < totalCost ? 'الخطة المسودة تتجاوز الميزانية الحالية.' : null,
          items: nextItems
        }
      ]
    };

    return this.save(plan);
  }

  remove(tripPlanId: ApiId): void {
    if (!this.isBrowser()) {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(this.getAll().filter((plan) => plan.tripPlanId !== tripPlanId)));
  }

  private createId(): ApiId {
    return `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}


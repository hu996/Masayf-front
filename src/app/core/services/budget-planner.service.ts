import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BudgetCityRecommendation, BudgetPlannerRequest, BudgetPlannerResponse, BudgetPlannerViewModel, CityBudgetResult, normalizeId } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BudgetPlannerService {
  constructor(private readonly api: ApiService) {}

  findBestCities(request: BudgetPlannerRequest): Observable<BudgetPlannerViewModel> {
    return this.api.post<BudgetPlannerResponse>('/BudgetPlanner/FindBestCities', request).pipe(
      map((response) => {
        const results = (response?.results ?? response?.cities ?? response?.recommendations ?? [])
          .map((item) => this.toViewModel(item));
        const selectedCityId = normalizeId(request.cityId);
        const primaryRecommendation = selectedCityId
          ? results.find((item) => normalizeId(item.cityId) === selectedCityId) ?? results[0] ?? null
          : results[0] ?? null;
        const alternativeRecommendations = primaryRecommendation
          ? results.filter((item) => normalizeId(item.cityId) !== normalizeId(primaryRecommendation.cityId))
          : results.slice(1);

        return {
          primaryRecommendation,
          alternativeRecommendations,
          results
        };
      })
    );
  }

  private toViewModel(item: BudgetCityRecommendation): CityBudgetResult {
    const breakdown = item.costBreakdown ?? {
      accommodation: 0,
      transportation: 0,
      food: 0,
      activities: 0,
      other: 0
    };
    const accommodation = item.recommendedAccommodation;

    return {
      ...item,
      fitScore: Number(item.fitScore ?? item.matchScore ?? 0),
      matchScore: Number(item.matchScore ?? item.fitScore ?? 0),
      estimatedTotalCost: Number(item.estimatedTotalCost ?? item.estimatedCost ?? 0),
      estimatedCost: Number(item.estimatedCost ?? item.estimatedTotalCost ?? 0),
      remainingBudget: Number(item.remainingBudget ?? 0),
      costBreakdown: breakdown,
      recommendedActivities: item.recommendedActivities ?? [],
      experienceCount: Number(item.experienceCount ?? 0),
      averageRating: Number(item.averageRating ?? 0),
      badges: item.badges ?? [],
      summary: item.summary ?? '',
      totalCost: Number(item.estimatedTotalCost ?? item.estimatedCost ?? 0),
      budgetStatus: item.badges?.[0],
      accommodationCost: Number(breakdown.accommodation ?? 0),
      transportationCost: Number(breakdown.transportation ?? 0),
      foodCost: Number(breakdown.food ?? 0),
      attractionsCost: Number(breakdown.activities ?? 0),
      experiencesCount: Number(item.experienceCount ?? 0),
      matchPercent: Number(item.fitScore ?? item.matchScore ?? 0),
      bestActivities: (item.recommendedActivities ?? []).map((activity) => activity.name),
      cheapestAccommodationId: accommodation?.placeId,
      cheapestAccommodationName: accommodation?.name,
      cheapestAccommodationPrice: accommodation?.pricePerNight
    };
  }
}

import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BudgetCityRecommendationDto, BudgetPlannerRequest, BudgetPlannerResponse } from '../models/budget-finder.model';
import { normalizeId } from '@app/core/models/api.models';
import { ApiService } from '@app/core/services/api.service';

@Injectable({ providedIn: 'root' })
export class BudgetPlannerService {
  constructor(private readonly api: ApiService) {}

  findBestCities(request: BudgetPlannerRequest): Observable<BudgetPlannerResponse> {
    return this.api.post<BudgetPlannerResponse>('/BudgetPlanner/FindBestCities', request).pipe(
      map((response) => {
        const results = this.normalizeResults(response?.results ?? response?.cities ?? []);
        const selectedCityId = normalizeId(request.cityId);
        const primaryRecommendation = selectedCityId
          ? results.find((item) => normalizeId(item.cityId) === selectedCityId) ?? results[0] ?? null
          : results[0] ?? null;
        const alternativeRecommendations = primaryRecommendation
          ? results.filter((item) => normalizeId(item.cityId) !== normalizeId(primaryRecommendation.cityId))
          : results.slice(1);

        return {
          searchId: response?.searchId ?? '',
          budget: Number(response?.budget ?? request.budget ?? 0),
          peopleCount: Number(response?.peopleCount ?? request.peopleCount ?? 0),
          daysCount: Number(response?.daysCount ?? request.daysCount ?? 0),
          primaryRecommendation,
          alternativeRecommendations,
          results,
          cities: results
        };
      })
    );
  }

  private normalizeResults(items: BudgetCityRecommendationDto[]): BudgetCityRecommendationDto[] {
    return (items ?? []).map((item) => {
      const breakdown = item.costBreakdown ?? {
        accommodation: 0,
        transportation: 0,
        food: 0,
        activities: 0,
        other: 0
      };

      return {
        ...item,
        fitScore: Number(item.fitScore ?? 0),
        estimatedTotalCost: Number(item.estimatedTotalCost ?? 0),
        remainingBudget: Number(item.remainingBudget ?? 0),
        costBreakdown: breakdown,
        recommendedActivities: item.recommendedActivities ?? [],
        experienceCount: Number(item.experienceCount ?? 0),
        averageRating: Number(item.averageRating ?? 0),
        badges: item.badges ?? [],
        summary: item.summary ?? '',
        confidence: item.confidence ?? {
          level: 'unknown',
          labelAr: 'تقدير مبدئي',
          usesFallbackEstimate: true,
          reasons: []
        },
        realExperiences: item.realExperiences ?? []
      };
    });
  }
}


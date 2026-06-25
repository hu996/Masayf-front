import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ActivityAlternative, ActivityAlternativeRequest, TripPlannerRequest, TripPlanResponse, TripScenario, TripScenarioItem } from '@app/core/models/api.models';
import { ApiService } from '@app/core/services/api.service';

@Injectable({ providedIn: 'root' })
export class TripPlannerService {
  constructor(private readonly api: ApiService) {}

  generate(request: TripPlannerRequest): Observable<TripPlanResponse> {
    return this.api.post<TripPlanResponse>('/TripPlanner/Generate', request).pipe(
      map((response) => ({
        ...response,
        scenarios: (response.scenarios ?? []).map((scenario) => this.normalizeScenario(scenario))
      }))
    );
  }

  getActivityAlternatives(request: ActivityAlternativeRequest): Observable<ActivityAlternative[]> {
    return this.api.get<ActivityAlternative[]>('/TripPlanner/GetActivityAlternatives', { ...request });
  }

  private normalizeScenario(scenario: TripScenario & { scenarioType: string | number }): TripScenario {
    const accommodations = (scenario.accommodationItems ?? scenario.accommodationSuggestions ?? []).map((item) => this.normalizeItem(item));
    const attractions = (scenario.attractionItems ?? scenario.attractionSuggestions ?? []).map((item) => this.normalizeItem(item));
    return {
      ...scenario,
      scenarioType: this.scenarioType(scenario.scenarioType),
      accommodationItems: accommodations,
      attractionItems: attractions,
      accommodationSuggestions: accommodations,
      attractionSuggestions: attractions,
      items: [...accommodations, ...attractions]
    };
  }

  private normalizeItem(item: TripScenarioItem & { itemType: string | number }): TripScenarioItem {
    const itemType = String(item.itemType);
    return {
      ...item,
      itemType: itemType === '1' ? 'Accommodation' : itemType === '2' ? 'Attraction' : itemType
    };
  }

  private scenarioType(value: string | number): string {
    const values: Record<string, string> = { '1': 'Economic', '2': 'Standard', '3': 'Comfortable' };
    return values[String(value)] ?? String(value);
  }
}

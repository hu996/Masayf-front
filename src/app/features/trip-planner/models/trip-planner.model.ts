import { ApiId } from '@app/core/models/api-id.model';

export interface TripPlannerRequest {
  cityId: ApiId;
  budget: number;
  daysCount: number;
  personsCount: number;
  tripType: number;
  preferredAccommodationType?: number | null;
  preferredTransportType?: number | null;
  fromGovernorateId?: ApiId | null;
  tripTypeCode?: string | null;
  preferredAccommodationTypeCode?: string | null;
  preferredTransportTypeCode?: string | null;
  interestCodes?: string[] | null;
}

export interface TripPlanCity {
  cityId: ApiId;
  cityName: string;
  imageUrl?: string | null;
}

export interface TripPlanResponse {
  tripPlanId: ApiId;
  city?: TripPlanCity;
  cityName: string;
  budget: number;
  allScenariosOverBudget?: boolean;
  warnings?: string[];
  scenarios: TripScenario[];
  alternativeActivities?: ActivityAlternative[];
}

export interface TripScenario {
  scenarioType: 'Economic' | 'Standard' | 'Comfortable' | string;
  accommodationItems?: TripScenarioItem[];
  attractionItems?: TripScenarioItem[];
  accommodationSuggestions?: TripScenarioItem[];
  attractionSuggestions?: TripScenarioItem[];
  accommodationCost: number;
  foodCost: number;
  transportationCost: number;
  attractionsCost: number;
  totalCost: number;
  remainingBudget: number;
  isOverBudget: boolean;
  warningMessage?: string | null;
  notes?: string[];
  items: TripScenarioItem[];
}

export interface TripScenarioItem {
  itemType: string;
  placeId?: ApiId | null;
  name: string;
  estimatedCost: number;
  dayNumber: number;
  score?: number;
  notes?: string | null;
}

export interface ActivityAlternativeRequest {
  cityId: ApiId;
  currentActivityId?: ApiId | null;
  interestCodes?: string;
  budgetRemaining?: number;
}

export interface ActivityAlternative {
  placeId: ApiId;
  name: string;
  categoryCode: string;
  categoryNameAr: string;
  cost?: number;
  estimatedCost?: number;
  durationHours: number;
  rating: number;
  imageUrl?: string | null;
}

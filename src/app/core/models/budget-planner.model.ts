import { ApiId } from './api-id.model';

export interface BudgetPlannerRequest {
  budget: number;
  peopleCount: number;
  daysCount: number;
  cityId?: ApiId | null;
  fromGovernorateId: ApiId | null;
  tripType: number;
  foodLevel: string;
  preferredAccommodationType?: number | null;
  preferredTransport?: number | null;
  tripTypeCode?: string | null;
  foodLevelCode?: string | null;
  interestCodes?: string[] | null;
}

export interface CostBreakdown {
  accommodation: number;
  transportation: number;
  food: number;
  activities: number;
  other: number;
}

export interface RecommendedAccommodation {
  placeId: ApiId;
  name: string;
  typeCode: string;
  pricePerNight: number;
  capacity?: number | null;
  rating?: number | null;
}

export interface RecommendedActivity {
  placeId: ApiId;
  name: string;
  categoryCode: string;
  categoryNameAr: string;
  type: number | string;
  cost: number;
  durationHours: number;
  rating: number;
  imageUrl?: string | null;
  estimatedCost?: number;
}

/** The city shape returned inside BudgetPlannerResponse.results. */
export interface BudgetCityRecommendation {
  cityId: ApiId;
  cityName: string;
  imageUrl?: string | null;
  fitScore?: number;
  /** Names emitted by the current BudgetPlanner API. */
  matchScore?: number;
  isWithinBudget: boolean;
  estimatedTotalCost?: number;
  estimatedCost?: number;
  remainingBudget: number;
  costBreakdown: CostBreakdown;
  recommendedAccommodation?: RecommendedAccommodation | null;
  recommendedActivities: RecommendedActivity[];
  experienceCount: number;
  averageRating: number;
  badges: string[];
  summary: string;
}

export interface BudgetPlannerResponse {
  searchId: ApiId;
  budget: number;
  peopleCount: number;
  daysCount: number;
  results?: BudgetCityRecommendation[];
  cities?: BudgetCityRecommendation[];
  recommendations?: BudgetCityRecommendation[];
}

export interface BudgetPlannerViewModel {
  primaryRecommendation: CityBudgetResult | null;
  alternativeRecommendations: CityBudgetResult[];
  results: CityBudgetResult[];
}

/** View model used by the current budget-result and destination-plan screens. */
export interface CityBudgetResult extends BudgetCityRecommendation {
  totalCost: number;
  budgetStatus?: string;
  accommodationCost: number;
  foodCost: number;
  transportationCost: number;
  attractionsCost: number;
  experiencesCount: number;
  matchPercent: number;
  bestActivities: string[];
  cheapestAccommodationName?: string;
  cheapestAccommodationPrice?: number;
  cheapestAccommodationId?: ApiId;
}

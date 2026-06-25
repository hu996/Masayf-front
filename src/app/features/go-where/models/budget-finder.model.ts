import { ApiId } from '@app/core/models/api-id.model';

export interface BudgetPlannerRequest {
  budget?: number;
  peopleCount?: number;
  daysCount?: number;
  fromGovernorateId?: ApiId | null;
  cityId?: ApiId | null;
  foodLevel?: string;
  preferredAccommodationType?: number | null;
  preferredTransport?: number | null;
  tripType?: number;
  tripTypeCode?: string | null;
  foodLevelCode?: string | null;
  interestCodes?: string[] | null;
}

export interface BudgetPlannerResponse {
  searchId: ApiId;
  budget: number;
  peopleCount: number;
  daysCount: number;
  results: BudgetCityRecommendationDto[];
  primaryRecommendation?: BudgetCityRecommendationDto | null;
  alternativeRecommendations?: BudgetCityRecommendationDto[] | null;
  cities?: BudgetCityRecommendationDto[];
}

export interface BudgetDestinationCompareRequest {
  planner: BudgetPlannerRequest;
  cityIds: ApiId[];
}

export interface BudgetDestinationCompareResponse {
  budget: number;
  peopleCount: number;
  daysCount: number;
  results: BudgetCityRecommendationDto[];
  decisionTips: string[];
}

export interface CostBreakdownDto {
  accommodation: number;
  transportation: number;
  food: number;
  activities: number;
  other: number;
}

export interface RecommendedAccommodationDto {
  placeId: ApiId;
  name: string;
  typeCode: string;
  pricePerNight: number;
  capacity?: number | null;
  rating?: number | null;
}

export interface RecommendedActivityDto {
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

export interface RecommendationConfidenceDto {
  level: string;
  labelAr: string;
  usesFallbackEstimate: boolean;
  reasons: string[];
}

export interface RealTripExperiencePreviewDto {
  id: ApiId;
  title: string;
  cityName: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  peopleCount: number;
  totalCost: number;
  rating: number;
  summary: string;
  coverImageUrl?: string | null;
  authorName?: string | null;
  authorUserName?: string | null;
  activityNames: string[];
  visitedPlaceNames: string[];
}

export interface BudgetCityRecommendationDto {
  cityId: ApiId;
  cityName: string;
  imageUrl?: string | null;
  fitScore: number;
  isWithinBudget: boolean;
  estimatedTotalCost: number;
  remainingBudget: number;
  costBreakdown: CostBreakdownDto;
  recommendedAccommodation?: RecommendedAccommodationDto | null;
  recommendedActivities: RecommendedActivityDto[];
  experienceCount: number;
  averageRating: number;
  badges: string[];
  summary: string;
  confidence: RecommendationConfidenceDto;
  realExperiences: RealTripExperiencePreviewDto[];
}

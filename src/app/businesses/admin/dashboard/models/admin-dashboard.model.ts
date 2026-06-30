import { ApiId } from '@app/core/models/api-id.model';
import { MediaImage } from '@app/core/models/api.models';

export interface DashboardStatCard {
  label: string;
  value: number;
  hint?: string;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface TopCityStat {
  cityId: ApiId;
  cityName: string;
  count: number;
}

export interface PendingExperienceRow {
  id: ApiId;
  title: string;
  cityName: string;
  authorName?: string | null;
  authorUserName?: string | null;
  totalCost?: number | null;
  rating?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | number | null;
  summary?: string | null;
  coverImageUrl?: string | null;
  images?: MediaImage[];
}

export interface AdminDashboardOverview {
  activeUsers?: number;
  newUsersThisWeek?: number;
  newUsersThisMonth?: number;
  citiesCount?: number;
  governoratesCount?: number;
  lookupTypesCount?: number;
  lookupItemsCount?: number;
  totalExperiencesCount?: number;
  draftExperiencesCount?: number;
  pendingExperiencesCount?: number;
  pendingReviewExperiencesCount?: number;
  publishedExperiencesCount?: number;
  rejectedExperiencesCount?: number;
  flaggedExperiencesCount?: number;
  totalPlacesCount?: number;
  pendingPlacesCount?: number;
  approvedPlacesCount?: number;
  tripPlansCount?: number;
  tripPlansThisWeek?: number;
  tripPlansThisMonth?: number;
  tripExperiencesThisWeek?: number;
  tripExperiencesThisMonth?: number;
  placesAddedThisWeek?: number;
  placesAddedThisMonth?: number;
  topCities?: TopCityStat[];
  experienceTrends?: TrendPoint[];
  tripPlanTrends?: TrendPoint[];
  recentPendingExperiences?: PendingExperienceRow[];
}

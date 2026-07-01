import { ApiId } from '@app/core/models/api-id.model';
import { MediaImage } from '@app/core/models/api.models';

export interface AdminExperiencePhoto extends MediaImage {}

export interface AdminExperienceExpense {
  title?: string | null;
  amount?: number | null;
  notes?: string | null;
}

export interface AdminExperienceVisitedPlace {
  name?: string | null;
  visitDate?: string | null;
  cost?: number | null;
}

export interface AdminExperienceRatingBreakdown {
  cleanliness?: number | null;
  price?: number | null;
  crowd?: number | null;
  family?: number | null;
  safety?: number | null;
  valueForMoney?: number | null;
}

export interface AdminExperienceRow {
  id: ApiId;
  title: string;
  cityName: string;
  authorName?: string | null;
  authorUserName?: string | null;
  totalCost?: number | null;
  rating?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  daysCount?: number | null;
  peopleCount?: number | null;
  status?: string | number | null;
  summary?: string | null;
  coverImageUrl?: string | null;
  images?: AdminExperiencePhoto[];
}

export interface AdminExperienceModerationDetail extends AdminExperienceRow {
  moderationStatus?: string | number | null;
  allowUseInSearch?: boolean | null;
  dateRange?: string | null;
  tripDetails?: string | null;
  accommodation?: string | null;
  expenses?: AdminExperienceExpense[];
  visitedPlaces?: AdminExperienceVisitedPlace[];
  ratingBreakdown?: AdminExperienceRatingBreakdown | null;
  photoGallery?: AdminExperiencePhoto[];
}

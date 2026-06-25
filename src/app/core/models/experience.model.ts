import { ApiId } from './api-id.model';
import { MediaImage } from './media-image.model';

export interface Experience {
  id?: ApiId;
  title: string;
  cityId?: ApiId;
  cityName: string;
  authorName?: string;
  authorUserName?: string;
  authorAvatarUrl?: string;
  startDate?: string;
  endDate?: string;
  daysCount: number;
  peopleCount: number;
  totalCost: number;
  costPerPerson?: number;
  costPerDay?: number;
  seasonType?: number | string;
  status?: number | string;
  rating: number;
  summary?: string;
  coverImageUrl?: string;
  coverImage?: string;
  imageUrl?: string;
  images?: Array<string | MediaImage>;
  imageItems?: MediaImage[];
  activityNames?: string[];
  visitedPlaceNames?: string[];
  tripType?: number;
  tips?: string[];
  expenses?: Array<{ title: string; amount: number }>;
}

export interface ExperienceSearchFilters {
  cityId?: ApiId;
  maxBudget?: number;
  daysCount?: number;
  peopleCount?: number;
  minRating?: number;
  tripType?: number;
  searchTerm?: string;
  sortBy?: string;
  sortDirection?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateTripExpenseItemRequest {
  category: number;
  amount: number;
  note?: string | null;
}

export interface CreateTripVisitedPlaceRequest {
  placeId: ApiId;
  visitDate?: string | null;
  cost: number;
  rating: number;
  comment?: string | null;
}

export interface CreateTripAccommodationRequest {
  accommodationType?: string | null;
  areaId?: ApiId | null;
  nightsCount: number;
  pricePerNight: number;
  roomsCount: number;
  bedsCount: number;
  wasClean: boolean;
  nearBeach: boolean;
  comment?: string | null;
  cleanlinessRate: number;
}

export interface CreateTripExperienceRequest {
  cityId: ApiId;
  areaId?: ApiId | null;
  title: string;
  startDate: string;
  endDate: string;
  peopleCount: number;
  adultsCount: number;
  childrenCount: number;
  tripType: number;
  transportType: number;
  rating: number;
  summary?: string | null;
  accommodation?: CreateTripAccommodationRequest | null;
  tripRating?: null;
  expenses: CreateTripExpenseItemRequest[];
  visitedPlaces: CreateTripVisitedPlaceRequest[];
  photos: Array<{ imageUrl: string; caption?: string | null; isCover: boolean }>;
}

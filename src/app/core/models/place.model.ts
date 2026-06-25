import { ApiId } from './api-id.model';

export interface Place {
  id: ApiId;
  placeId?: ApiId;
  name: string;
  description?: string;
  cityId?: ApiId;
  areaId?: ApiId;
  cityName?: string;
  areaName?: string;
  type?: string;
  category?: string;
  address?: string;
  price?: number;
  priceFrom?: number;
  priceTo?: number;
  pricePerNight?: number;
  capacity?: number;
  personsCount?: number;
  averageRating?: number;
  rating?: number;
  durationHours?: number;
  duration?: string;
  mainImageUrl?: string;
  imageUrl?: string;
  images?: string[];
  isActive?: boolean;
}


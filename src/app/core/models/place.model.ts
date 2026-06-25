import { ApiId } from './api-id.model';
import { MediaImage } from './media-image.model';

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
  images?: Array<string | MediaImage>;
  imageItems?: MediaImage[];
  isActive?: boolean;
}

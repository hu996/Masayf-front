import { ApiId } from '@app/core/models/api-id.model';
import { MediaImage } from '@app/core/models/api.models';

export interface AdminPlaceRow {
  id: ApiId;
  cityId?: ApiId | null;
  areaId?: ApiId | null;
  name: string;
  type?: string | null;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  pricePerNight?: number | null;
  capacity?: number | null;
  averageRating?: number | null;
  durationHours?: number | null;
  category?: string | null;
  cityName?: string | null;
  areaName?: string | null;
  isActive: boolean;
  mainImageUrl?: string | null;
  images?: MediaImage[];
}

export interface AdminPlaceFormValue {
  cityId: ApiId | null;
  areaId: ApiId | null;
  name: string;
  type: string;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  priceFrom: number | null;
  priceTo: number | null;
  pricePerNight: number | null;
  capacity: number | null;
  averageRating: number | null;
  durationHours: number | null;
  category: string;
  isActive: boolean;
}

export interface AdminPlaceImageDraft {
  id?: ApiId;
  imageUrl: string;
  caption?: string | null;
  isMain?: boolean;
  sortOrder?: number | null;
  originalCaption?: string | null;
  originalIsMain?: boolean;
  originalSortOrder?: number | null;
}

export interface AdminPlaceImageUploadDraft {
  file: File;
  previewUrl: string;
  main?: boolean;
}

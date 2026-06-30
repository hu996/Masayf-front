import { ApiId } from '@app/core/models/api-id.model';
import { MediaImage } from '@app/core/models/api.models';

export interface AdminPlaceRow {
  id: ApiId;
  name: string;
  cityName?: string | null;
  typeName?: string | null;
  description?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  isActive: boolean;
  isVerified?: boolean;
  mainImageUrl?: string | null;
  rating?: number | null;
  images?: MediaImage[];
}

export interface AdminPlaceFormValue {
  name: string;
  cityName: string;
  typeName: string;
  description: string;
  priceFrom: number | null;
  priceTo: number | null;
  isActive: boolean;
}

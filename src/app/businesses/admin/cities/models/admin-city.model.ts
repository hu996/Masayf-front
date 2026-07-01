import { ApiId } from '@app/core/models/api-id.model';
import { MediaImage } from '@app/core/models/api.models';

export interface AdminCityRow {
  id: ApiId;
  name: string;
  governorateId?: ApiId | null;
  governorateName: string;
  description: string;
  mainImageUrl?: string | null;
  crowdLevel: number;
  priceLevel: number;
  images?: MediaImage[];
  placesCount?: number;
  experiencesCount?: number;
}

export interface AdminCityFormValue {
  governorateId: ApiId | null;
  name: string;
  description: string;
  suitableForFamilies: boolean;
  suitableForYouth: boolean;
  suitableForKids: boolean;
  crowdLevel: number | null;
  priceLevel: number | null;
  isActive: boolean;
  photos?: File[];
  mainImageIndex?: number | null;
}

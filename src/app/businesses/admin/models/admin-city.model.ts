import { ApiId } from '@app/core/models/api-id.model';
import { MediaImage } from '@app/core/models/api.models';

export interface AdminCityRow {
  id: ApiId;
  name: string;
  governorateName?: string | null;
  priceLevelName?: string | null;
  crowdLevelName?: string | null;
  isActive: boolean;
  mainImageUrl?: string | null;
  images?: MediaImage[];
  placesCount?: number;
  experiencesCount?: number;
}

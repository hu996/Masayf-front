import { ApiId } from './api-id.model';

export interface City {
  id: ApiId;
  cityId?: ApiId;
  name: string;
  description?: string;
  mainImageUrl?: string;
  coverImage?: string;
  imageUrl?: string;
  isActive?: boolean;
  areas?: Area[];
}

export interface Area {
  id: ApiId;
  areaId?: ApiId;
  name: string;
  cityId?: ApiId;
}


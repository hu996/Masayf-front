import { ApiId } from '@app/core/models/api-id.model';
import { MediaImage } from '@app/core/models/api.models';

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
  status?: string | number | null;
  summary?: string | null;
  coverImageUrl?: string | null;
  images?: MediaImage[];
}

export interface AdminExperienceModerationDetail extends AdminExperienceRow {
  expenses?: Array<{ title: string; amount: number }>;
  visitedPlaces?: Array<{ name: string; visitDate?: string | null; cost?: number | null }>;
  photoGallery?: MediaImage[];
}

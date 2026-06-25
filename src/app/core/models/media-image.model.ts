import { ApiId } from './api-id.model';

export interface MediaImage {
  id?: ApiId;
  imageUrl: string;
  caption?: string | null;
  isMain?: boolean;
  isCover?: boolean;
  sortOrder?: number;
  status?: string | number | null;
}

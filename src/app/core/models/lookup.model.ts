import { ApiId } from './api-id.model';

export interface LookupItem {
  id: ApiId;
  typeCode: string;
  code: string;
  numericValue?: number | null;
  nameAr: string;
  nameEn?: string | null;
  sortOrder?: number;
}

export interface LookupGroup {
  typeCode: string;
  nameAr: string;
  nameEn?: string | null;
  items: LookupItem[];
}

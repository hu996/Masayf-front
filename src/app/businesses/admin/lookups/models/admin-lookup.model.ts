import { ApiId } from '@app/core/models/api-id.model';

export interface LookupTypeRow {
  id: ApiId;
  code: string;
  nameAr: string;
  nameEn?: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  itemsCount: number;
}

export interface LookupTypeFormValue {
  code: string;
  nameAr: string;
  nameEn: string | null;
  sortOrder: number | null;
  isActive: boolean;
}

export interface LookupItemRow {
  id: ApiId;
  lookupTypeId: ApiId;
  typeCode: string;
  typeNameAr: string;
  code: string;
  numericValue?: number | null;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  icon?: string | null;
  color?: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  isAccommodationType: boolean;
  isAttractionType: boolean;
}

export interface LookupItemFormValue {
  lookupTypeId: ApiId | null;
  code: string;
  numericValue: number | null;
  nameAr: string;
  nameEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number | null;
  isActive: boolean;
  isAccommodationType: boolean;
  isAttractionType: boolean;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
}

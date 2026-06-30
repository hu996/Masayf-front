import { ApiId } from '@app/core/models/api-id.model';

export interface AdminGovernorateRow {
  id?: ApiId;
  name: string;
  citiesCount?: number | null;
  cityCount?: number | null;
  totalCities?: number | null;
  createdAt?: string | null;
  addedAt?: string | null;
}

export interface AdminGovernorateFormValue {
  name: string;
}


import { ApiId } from '@app/core/models/api-id.model';

export interface AdminPriceProfileRow {
  id: ApiId;
  cityId: ApiId;
  cityName: string;
  level: string;
  costPerPersonPerDay: number;
  notes?: string | null;
}

export interface AdminPriceProfileFormValue {
  cityId: ApiId | null;
  level: string;
  costPerPersonPerDay: number | null;
  notes: string | null;
}

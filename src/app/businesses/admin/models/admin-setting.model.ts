import { ApiId } from '@app/core/models/api-id.model';

export interface AdminSettingRow {
  id: ApiId;
  key: string;
  value: string;
  group: string;
  description?: string | null;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminSettingFormValue {
  key: string;
  value: string;
  group: string;
  description?: string | null;
  isPublic: boolean;
}

import { ApiId } from '@app/core/models/api-id.model';

export interface AdminRoleRow {
  id: ApiId;
  name: string;
  displayName?: string | null;
  description?: string | null;
  permissionKeys?: string[];
  usersCount?: number | null;
  isActive?: boolean | null;
  createdAt?: string | null;
}

export interface AdminRoleFormValue {
  name: string;
  description?: string;
  permissionKeys: string[];
}

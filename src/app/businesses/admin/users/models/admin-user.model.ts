import { ApiId } from '@app/core/models/api-id.model';

export interface AdminUserRow {
  id: ApiId;
  fullName: string;
  userName: string;
  email: string;
  isActive: boolean;
  roleName: string;
  roleDisplayName?: string | null;
  roles?: string[];
  createdAt: string;
}

export interface AdminUserFormValue {
  fullName: string;
  userName: string;
  email: string;
  password?: string;
  roleName: string;
  isActive: boolean;
}

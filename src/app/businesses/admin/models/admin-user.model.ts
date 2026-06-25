import { ApiId } from '@app/core/models/api-id.model';

export interface AdminUserRow {
  id: ApiId;
  fullName: string;
  userName: string;
  email: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
}

export interface AdminUserFormValue {
  fullName: string;
  userName: string;
  email: string;
  password?: string;
  roles: string[];
}

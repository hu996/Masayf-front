export interface AdminPermissionItem {
  id?: string;
  permissionId?: string;
  key: string;
  label: string;
  description?: string;
  groupKey: string;
  groupLabel: string;
  screen?: string;
  selected?: boolean;
  code?: string;
  nameAr?: string;
  nameEn?: string;
  controller?: string;
  action?: string;
  isMenuItem?: boolean;
  isActive?: boolean;
  menuGroup?: string;
  sortOrder?: number;
  route?: string;
}

export interface AdminPermissionGroup {
  key: string;
  label: string;
  sortOrder?: number;
  items: AdminPermissionItem[];
}

export interface AdminPermissionCatalogResponse {
  groups?: AdminPermissionGroup[];
  permissions?: AdminPermissionItem[];
  items?: AdminPermissionItem[];
}

export interface AdminPermissionScreenResponse {
  key: string;
  nameAr: string;
  nameEn?: string | null;
  menuGroup?: string | null;
  sortOrder?: number | null;
  actions: Array<{
    id?: string | null;
    permissionId?: string | null;
    key: string;
    nameAr: string;
    nameEn?: string | null;
    description?: string | null;
    controller?: string | null;
    action?: string | null;
    isMenuItem?: boolean | null;
    isActive?: boolean | null;
    route?: string | null;
  }>;
}

export interface AdminPermissionSelectionPayload {
  permissionIds: string[];
}

export interface AdminUserPermissionSelectionPayload {
  permissionKeys: string[];
}

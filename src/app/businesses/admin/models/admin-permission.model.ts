export interface AdminPermissionItem {
  key: string;
  label: string;
  description?: string;
  groupKey: string;
  groupLabel: string;
  screen?: string;
  selected?: boolean;
}

export interface AdminPermissionGroup {
  key: string;
  label: string;
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
  actions: Array<{
    key: string;
    nameAr: string;
    description?: string | null;
  }>;
}

export interface AdminPermissionSelectionPayload {
  permissionKeys: string[];
}

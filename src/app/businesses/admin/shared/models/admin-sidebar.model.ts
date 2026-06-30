export interface AdminSidebarItem {
  key: string;
  label: string;
  labelEn?: string;
  route?: string | null;
  icon?: string | null;
  permissionCode?: string | null;
  menuGroup?: string | null;
  menuGroupLabel?: string | null;
  sortOrder: number;
  groupSortOrder: number;
  isVisible: boolean;
  isActive: boolean;
  badge?: string | number | null;
  children?: AdminSidebarItem[];
}

export interface AdminSidebarGroup {
  key: string;
  label: string;
  sortOrder: number;
  items: AdminSidebarItem[];
}


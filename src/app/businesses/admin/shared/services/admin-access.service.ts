import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { map, Observable, of, shareReplay, tap } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { AdminAuthService } from '../../auth/services/admin-auth.service';
import { AdminSidebarGroup, AdminSidebarItem } from '../models/admin-sidebar.model';

type RawValue = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class AdminAccessService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AdminAuthService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly sidebarGroups = signal<AdminSidebarGroup[]>([]);
  readonly sidebarLoading = signal(false);
  readonly sidebarError = signal('');
  readonly sidebarLoaded = signal(false);

  readonly visibleItems = computed(() => this.sidebarGroups().flatMap((group) => group.items));
  readonly isAdminSession = computed(() => this.hasRole('Admin'));
  readonly allowedTokens = computed(() => {
    if (this.isAdminSession()) {
      return new Set<string>(['*']);
    }

    const tokens = new Set(this.visibleItems().flatMap((item) => this.tokenizeItem(item)));
    const session = this.auth.session();
    [...(session?.permissions ?? []), ...(session?.permissionCodes ?? [])].forEach((value) => {
      const token = String(value ?? '').trim().toLowerCase();
      if (token) {
        tokens.add(token);
      }
    });
    return tokens;
  });

  private sidebarRequest$: Observable<AdminSidebarGroup[]> | null = null;

  constructor() {
    effect(() => {
      if (!this.auth.session()) {
        this.clear();
      }
    });
  }

  refreshSidebar(): Observable<AdminSidebarGroup[]> {
    return this.loadSidebar(true);
  }

  loadSidebar(force = false): Observable<AdminSidebarGroup[]> {
    if (!isPlatformBrowser(this.platformId)) {
      this.sidebarLoading.set(false);
      this.sidebarError.set('');
      this.sidebarLoaded.set(true);
      this.sidebarGroups.set([]);
      return of([]);
    }

    if (!force && this.sidebarLoaded()) {
      return of(this.sidebarGroups());
    }

    if (!force && this.sidebarRequest$) {
      return this.sidebarRequest$;
    }

    this.sidebarLoading.set(true);
    this.sidebarError.set('');

    const request$ = this.api.get<unknown>('/Admin/Permissions/Sidebar').pipe(
      map((response) => this.normalizeSidebar(response)),
      tap((groups) => {
        this.sidebarGroups.set(groups);
        this.sidebarLoaded.set(true);
      }),
      tap({
        error: (error: unknown) => {
          this.sidebarError.set(error instanceof Error ? error.message : 'تعذر تحميل قائمة الأدمن.');
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.sidebarRequest$ = request$;

    request$.subscribe({
      error: () => {
        this.sidebarLoading.set(false);
        this.sidebarRequest$ = null;
      },
      complete: () => {
        this.sidebarLoading.set(false);
        this.sidebarRequest$ = null;
      }
    });

    return request$;
  }

  clear(): void {
    this.sidebarGroups.set([]);
    this.sidebarLoaded.set(false);
    this.sidebarError.set('');
    this.sidebarRequest$ = null;
  }

  canAccess(...candidates: Array<string | null | undefined>): boolean {
    if (this.isAdminSession()) {
      return true;
    }

    const normalized = candidates.filter(Boolean).map((value) => String(value).trim().toLowerCase());
    if (!normalized.length) return true;

    const tokens = this.allowedTokens();
    return normalized.some((candidate) => tokens.has(candidate));
  }

  canAccessRoute(routePath: string, permissionCandidates: Array<string | null | undefined> = []): boolean {
    if (this.isAdminSession()) {
      return true;
    }

    const normalizedRoute = this.normalizeRoute(routePath);
    if (!normalizedRoute) return true;

    const routeTokens = [
      normalizedRoute,
      normalizedRoute.replace(/^\/admin\/?/, ''),
      normalizedRoute.replace(/^\/+/, ''),
      normalizedRoute.split('/').pop() || ''
    ].filter(Boolean);

    return this.canAccess(...permissionCandidates, ...routeTokens);
  }

  trackByGroup(_: number, group: AdminSidebarGroup): string {
    return group.key;
  }

  trackByItem(_: number, item: AdminSidebarItem): string {
    return item.key;
  }

  private normalizeSidebar(response: unknown): AdminSidebarGroup[] {
    const rawGroups = this.extractGroups(response);
    const usedGroupKeys = new Set<string>();
    const groups = rawGroups.map((group, index) => {
      const items = this.extractItems(group).map((item, itemIndex) => this.normalizeItem(item, group, index, itemIndex));
      const normalizedGroup = this.normalizeGroup(group, index, usedGroupKeys);
      const usedItemKeys = new Set<string>();

      return {
        ...normalizedGroup,
        items: items
          .filter((item) => item.isVisible && item.isActive)
          .map((item) => ({ ...item, key: this.ensureGloballyUniqueKey(item.key, `item-${index}`, usedItemKeys) }))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'ar'))
      };
    });

    return groups
      .filter((group) => group.items.length > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'ar'));
  }

  private normalizeGroup(group: unknown, index: number, usedKeys: Set<string>): AdminSidebarGroup {
    const raw = this.asRecord(group);
    const label = this.pickText(raw, ['menuGroupLabel', 'groupLabel', 'labelAr', 'nameAr', 'displayName', 'label', 'name']) || 'القائمة';
    const key = this.ensureGloballyUniqueKey(
      this.pickText(raw, ['key', 'menuGroup', 'groupKey', 'name', 'id']),
      `group-${index}`,
      usedKeys,
      index
    );

    return {
      key: key.toLowerCase(),
      label,
      sortOrder: this.pickNumber(raw, ['menuGroupSortOrder', 'groupSortOrder', 'sortOrder', 'order'], index),
      items: []
    };
  }

  private normalizeItem(item: unknown, group: unknown, groupIndex: number, itemIndex: number): AdminSidebarItem {
    const raw = this.asRecord(item);
    const groupRaw = this.asRecord(group);
    const groupLabel = this.pickText(groupRaw, ['menuGroupLabel', 'groupLabel', 'labelAr', 'nameAr', 'displayName', 'label', 'name'])
      || this.pickText(raw, ['menuGroupLabel', 'groupLabel', 'labelAr', 'nameAr', 'displayName', 'menuGroup', 'group'])
      || 'القائمة';

    const route = this.pickText(raw, ['route', 'url', 'path', 'routerLink']);
    const key = this.ensureGloballyUniqueKey(
      this.pickText(raw, ['permissionCode', 'permissionKey', 'code', 'key', 'name', 'id', 'route', 'path', 'url']),
      `${groupLabel}-${groupIndex}-${itemIndex}`,
      new Set<string>(),
      itemIndex,
      groupIndex
    );
    const label = this.pickText(raw, ['labelAr', 'nameAr', 'displayName', 'label', 'title', 'name']) || key;
    const labelEn = this.pickText(raw, ['labelEn', 'nameEn', 'titleEn', 'englishName']);
    const permissionCode = this.pickText(raw, ['permissionCode', 'permissionKey', 'code']);
    const menuGroup = this.pickText(raw, ['menuGroup', 'group', 'category']) || groupLabel;
    const icon = this.pickText(raw, ['icon', 'iconClass', 'iconName']);
    const isVisible = this.pickBoolean(raw, ['isVisible', 'visible', 'isAllowed', 'allowed', 'show', 'display'], true);
    const isActive = this.pickBoolean(raw, ['isActive', 'active', 'enabled', 'isEnabled'], true);
    const sortOrder = this.pickNumber(raw, ['sortOrder', 'order', 'displayOrder'], itemIndex);
    const groupSortOrder = this.pickNumber(groupRaw, ['menuGroupSortOrder', 'groupSortOrder', 'sortOrder', 'order'], groupIndex);
    const badge = this.pickText(raw, ['badge', 'count', 'total']) || this.pickNumber(raw, ['badge', 'count', 'total'], NaN as number);
    const children = this.extractItems(raw['children'] ?? raw['items'] ?? raw['childrenItems'])
      .map((child, childIndex) => this.normalizeItem(child, raw, groupIndex, childIndex));

    return {
      key: key.toLowerCase(),
      label,
      labelEn,
      route,
      icon,
      permissionCode,
      menuGroup,
      menuGroupLabel: groupLabel,
      sortOrder,
      groupSortOrder,
      isVisible,
      isActive,
      badge: Number.isFinite(Number(badge)) ? Number(badge) : badge || null,
      children: children.length ? children : undefined
    };
  }

  private extractGroups(response: unknown): unknown[] {
    if (Array.isArray(response)) {
      if (!response.length) return [];
      const first = this.asRecord(response[0]);

      if ('items' in first || 'children' in first || 'menuGroup' in first || 'group' in first || 'groupKey' in first) {
        return response;
      }

      return [{ key: 'default', label: 'القائمة', items: response }];
    }

    const raw = this.asRecord(response);
    const groups = raw['groups'] ?? raw['items'] ?? raw['permissions'] ?? raw['sidebar'] ?? raw['menus'];
    if (Array.isArray(groups)) return groups;

    if (groups && typeof groups === 'object') {
      return Object.values(groups as Record<string, unknown>);
    }

    if (raw['menuGroups'] && Array.isArray(raw['menuGroups'])) return raw['menuGroups'];
    return [];
  }

  private extractItems(source: unknown): unknown[] {
    if (Array.isArray(source)) return source;
    if (!source || typeof source !== 'object') return [];

    const raw = this.asRecord(source);
    const items = raw['items'] ?? raw['children'] ?? raw['permissions'] ?? raw['menus'] ?? raw['subItems'];
    return Array.isArray(items) ? items : [];
  }

  private tokenizeItem(item: AdminSidebarItem): string[] {
    return [
      item.key,
      item.label,
      item.labelEn,
      item.route ?? '',
      item.permissionCode ?? '',
      item.menuGroup ?? '',
      item.menuGroupLabel ?? ''
    ]
      .map((value) => String(value ?? '').trim().toLowerCase())
      .filter(Boolean);
  }

  private normalizeRoute(route: string): string {
    return route.trim().replace(/\/+$/g, '').toLowerCase();
  }

  private asRecord(value: unknown): RawValue {
    return value && typeof value === 'object' ? (value as RawValue) : {};
  }

  private hasRole(role: string): boolean {
    const current = (this.auth.session()?.roles ?? []).map((value) => String(value).trim().toLowerCase());
    return current.includes(role.trim().toLowerCase());
  }

  private pickText(source: RawValue, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }

  private pickNumber(source: RawValue, keys: string[], fallback: number): number {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return fallback;
  }

  private pickBoolean(source: RawValue, keys: string[], fallback: boolean): boolean {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'y', 'active', 'enabled', 'visible'].includes(normalized)) return true;
        if (['false', '0', 'no', 'n', 'inactive', 'disabled', 'hidden'].includes(normalized)) return false;
      }
    }
    return fallback;
  }

  private ensureGloballyUniqueKey(value: string, fallback: string, usedKeys: Set<string>, ...parts: number[]): string {
    const base = String(value ?? '').trim();
    const normalizedBase = base && base !== '0' ? base : fallback;
    const suffix = parts.length ? `-${parts.join('-')}` : '';
    let candidate = `${normalizedBase}${suffix}`.toLowerCase();
    let counter = 1;

    while (usedKeys.has(candidate)) {
      candidate = `${normalizedBase}${suffix}-${counter++}`.toLowerCase();
    }

    usedKeys.add(candidate);
    return candidate;
  }
}

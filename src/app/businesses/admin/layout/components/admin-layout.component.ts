import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminAuthService } from '../../auth/services/admin-auth.service';
import { AdminAccessService } from '../../shared/services/admin-access.service';
import { AdminSidebarGroup, AdminSidebarItem } from '../../shared/models/admin-sidebar.model';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly auth = inject(AdminAuthService);
  readonly access = inject(AdminAccessService);

  readonly sidebarOpen = signal(true);
  readonly pageTitle = signal('لوحة الإدارة');

  ngOnInit(): void {
    this.access.loadSidebar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.syncTitle(this.router.routerState.snapshot.root);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.syncTitle(this.router.routerState.snapshot.root));
  }

  retrySidebarLoad(): void {
    this.access.refreshSidebar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  logout(): void {
    this.auth.logout();
    this.access.clear();
    void this.router.navigateByUrl('/admin/login');
  }

  goToAccessDenied(event: MouseEvent): void {
    event.preventDefault();
    void this.router.navigateByUrl('/admin/access-denied');
    this.closeSidebar();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  openSidebar(): void {
    this.sidebarOpen.set(true);
  }

  initials(): string {
    const name = this.auth.session()?.fullName || this.auth.session()?.userName || 'A';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  trackByGroup(_: number, group: AdminSidebarGroup): string {
    return group.key;
  }

  trackByItem(_: number, item: AdminSidebarItem): string {
    return item.key;
  }

  itemRoute(item: AdminSidebarItem): string {
    const route = this.normalizeRouteCandidate(item.route);
    if (route) {
      return route.startsWith('/') ? route : `/admin/${route.replace(/^\/+/, '')}`;
    }

    const key = this.normalizeRouteCandidate(item.key);
    const label = this.normalizeRouteCandidate(item.label);
    const labelEn = this.normalizeRouteCandidate(item.labelEn);
    const permission = this.normalizeRouteCandidate(item.permissionCode);
    const group = this.normalizeRouteCandidate(item.menuGroupLabel || item.menuGroup);
    const candidates = [key, label, labelEn, permission, group].filter(Boolean).join(' ');

    const routeSlug =
      this.matchRoute(candidates) ||
      this.matchRoute(permission) ||
      this.matchRoute(labelEn) ||
      this.matchRoute(label) ||
      this.matchRoute(key) ||
      'dashboard';

    return `/admin/${routeSlug}`;
  }

  itemLabel(item: AdminSidebarItem): string {
    return item.label || item.labelEn || item.key;
  }

  itemBadge(item: AdminSidebarItem): string | number | null {
    return item.badge ?? null;
  }

  navigateTo(item: AdminSidebarItem, event: MouseEvent): void {
    event.preventDefault();
    const route = this.itemRoute(item);
    void this.router.navigateByUrl(route);
    this.closeSidebar();
  }

  isActive(item: AdminSidebarItem): boolean {
    const route = this.router.url.toLowerCase();
    const itemRoute = this.itemRoute(item).toLowerCase();
    return Boolean(itemRoute) && (route === itemRoute || route.startsWith(`${itemRoute}/`));
  }

  private syncTitle(root: ActivatedRouteSnapshot): void {
    const title = this.resolveTitle(root);
    this.pageTitle.set(title || 'لوحة الإدارة');
  }

  private resolveTitle(route: ActivatedRouteSnapshot): string {
    let current: ActivatedRouteSnapshot | null = route;
    while (current) {
      const data = current.routeConfig?.data as Record<string, unknown> | undefined;
      const title = data?.['title'];
      if (typeof title === 'string' && title.trim()) {
        return title.trim();
      }
      current = current.firstChild;
    }
    return '';
  }

  private normalizeRouteCandidate(value: string | null | undefined): string {
    const text = String(value ?? '').trim();
    if (!text) return '';

    if (text.startsWith('/admin/')) {
      return text.replace(/\/+$/, '');
    }

    if (text.toLowerCase().startsWith('admin/')) {
      return `/${text}`.replace(/\/+/g, '/').replace(/\/+$/, '');
    }

    if (text.startsWith('/')) {
      return `/admin${text}`.replace(/\/+/g, '/').replace(/\/+$/, '');
    }

    return text.toLowerCase();
  }

  private matchRoute(input: string): string {
    const text = this.stripDiacritics(input).toLowerCase();
    if (!text) return '';

    const routeMatches: Array<[RegExp, string]> = [
      [/dashboard|لوحة|تحكم|overview|home/, 'dashboard'],
      [/users|user|مستخدم|accounts?/, 'users'],
      [/settings|setting|اعداد|إعداد|configuration|config/, 'settings'],
      [/cities|city|مدن|مدينة/, 'cities'],
      [/price|pricing|cost|سعر|أسعار|profile/, 'price-profiles'],
      [/experience|تجربة|تجارب|review/, 'experiences'],
      [/place|أماكن|مكان|location/, 'places'],
      [/roles|role|أدوار|دور/, 'roles'],
      [/permission|صلاحيات|privilege|access/, 'permissions'],
      [/lookup|قوائم|مرجعية|reference|catalog/, 'lookups']
    ];

    const match = routeMatches.find(([pattern]) => pattern.test(text));
    return match?.[1] ?? '';
  }

  private stripDiacritics(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[^\w\u0600-\u06FF\s-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

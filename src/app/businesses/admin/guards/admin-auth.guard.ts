import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../auth/services/admin-auth.service';
import { AdminAccessService } from '../shared/services/admin-access.service';
import { catchError, map, of } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const adminAuthGuard: CanActivateFn = () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  return auth.isAuthenticated() ? true : router.parseUrl('/admin/login');
};

export const adminAuthChildGuard: CanActivateChildFn = (childRoute: ActivatedRouteSnapshot) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  const access = inject(AdminAccessService);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/admin/login');
  }

  if (childRoute.routeConfig?.path === 'access-denied' || childRoute.routeConfig?.path === 'login') {
    return true;
  }

  if (auth.hasAnyRole('Admin')) {
    return true;
  }

  const permissions = readPermissionCandidates(childRoute);
  const routePath = buildRoutePath(childRoute);

  if (access.canAccess(...permissions) || access.canAccessRoute(routePath, permissions)) {
    return true;
  }

  if (!permissions.length) {
    return access.loadSidebar().pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }

  return access.loadSidebar().pipe(
    map(() => {
      if (access.canAccess(...permissions) || access.canAccessRoute(routePath, permissions)) {
        return true;
      }

      return router.parseUrl('/admin/access-denied');
    }),
    catchError(() => of(router.parseUrl('/admin/access-denied')))
  );
};

function readPermissionCandidates(route: ActivatedRouteSnapshot): string[] {
  const data = route.routeConfig?.data as Record<string, unknown> | undefined;
  const candidates = data?.['requiredPermissions'] ?? data?.['permission'] ?? data?.['permissions'];
  if (Array.isArray(candidates)) {
    return candidates.filter((item): item is string => typeof item === 'string');
  }

  if (typeof candidates === 'string') {
    return [candidates];
  }

  return [];
}

function buildRoutePath(route: ActivatedRouteSnapshot): string {
  const segments = route.pathFromRoot
    .flatMap((snapshot) => snapshot.url.map((segment) => segment.path))
    .filter(Boolean);

  return `/${segments.join('/')}`;
}

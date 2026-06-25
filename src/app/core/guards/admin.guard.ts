import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/access-denied');
  }

  if (!auth.hasAnyRole('Admin', 'Moderator')) {
    return router.parseUrl('/access-denied');
  }

  return true;
};


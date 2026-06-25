import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { readAuthSession } from '../auth/auth-session';
import { readAdminAuthSession } from '../../businesses/admin/models/admin-auth.model';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = readAuthSession() ?? (request.url.includes('/Admin/') ? readAdminAuthSession() : null);
  const apiUrl = environment.apiBaseUrl.replace(/\/$/, '');

  if (!session || !request.url.startsWith(apiUrl)) return next(request);

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${session.token}` }
  }));
};

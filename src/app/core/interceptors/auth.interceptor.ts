import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { readAuthSession } from '../auth/auth-session';
import { readAdminAuthSession } from '../../businesses/admin/auth/models/admin-auth.model';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiUrl = environment.apiBaseUrl.replace(/\/$/, '');
  const isAdminRequest = request.url.includes('/Admin/');
  const session = isAdminRequest ? readAdminAuthSession() ?? readAuthSession() : readAuthSession();

  if (!session || !request.url.startsWith(apiUrl)) return next(request);

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${session.token}` }
  }));
};

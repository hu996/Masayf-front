import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { readAuthSession } from '../auth/auth-session';
import { readAdminAuthSession } from '../../businesses/admin/auth/models/admin-auth.model';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiUrl = environment.apiBaseUrl.replace(/\/$/, '');
  const backendUrl = (environment.backendBaseUrl || '').replace(/\/$/, '');
  const isAdminRequest = request.url.includes('/Admin/');
  const session = isAdminRequest ? readAdminAuthSession() ?? readAuthSession() : readAuthSession();

  const isApiRequest = request.url.startsWith(apiUrl) || (backendUrl && request.url.startsWith(backendUrl));

  if (!session || !isApiRequest) return next(request);

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${session.token}` }
  }));
};

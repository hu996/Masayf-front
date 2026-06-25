import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { readAuthSession } from '../auth/auth-session';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = readAuthSession();
  const apiUrl = environment.apiBaseUrl.replace(/\/$/, '');

  if (!session || !request.url.startsWith(apiUrl)) return next(request);

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${session.token}` }
  }));
};

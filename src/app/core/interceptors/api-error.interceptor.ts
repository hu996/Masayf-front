import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AdminAuthService } from '../../businesses/admin/services/admin-auth.service';

interface ApiErrorBody {
  message?: string;
  errors?: string[] | Record<string, string[]>;
  statusCode?: number;
}

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const router = inject(Router);
  const adminAuth = inject(AdminAuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.url.includes('/Admin/') && (error.status === 401 || error.status === 403)) {
        adminAuth.logout();
        void router.navigateByUrl('/admin/login');
      }

      const body = error.error as ApiErrorBody | null;
      const details = [
        body?.message,
        formatErrors(body?.errors),
        body?.statusCode || error.status ? `كود الخطأ: ${body?.statusCode || error.status}` : null
      ].filter(Boolean).join(' | ');

      const message = error.status === 0
        ? 'تعذر الاتصال بالخادم. تأكد من تشغيل خادم Masayef.'
        : details || statusMessage(error.status) || 'حدث خطأ أثناء تحميل البيانات.';

      toast.show(message, 'error');
      return throwError(() => error);
    })
  );
};

function statusMessage(status: number): string {
  if (status === 403) {
    return 'لا تملك الصلاحيات الكافية للوصول إلى هذه البيانات.';
  }
  if (status === 404) {
    return 'لم يتم العثور على البيانات المطلوبة.';
  }
  return '';
}

function formatErrors(errors: ApiErrorBody['errors']): string {
  if (!errors) {
    return '';
  }
  if (Array.isArray(errors)) {
    return errors.join(' - ');
  }
  return Object.values(errors).flat().join(' - ');
}

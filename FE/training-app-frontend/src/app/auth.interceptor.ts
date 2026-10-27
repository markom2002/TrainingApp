import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  if (!request.url.startsWith('https://localhost:7089/api/') ||
      request.url.startsWith('https://localhost:7089/api/auth/')) {
    return next(request);
  }
  const token = auth.getToken();
  const authorized = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  return next(authorized).pipe(catchError(error => {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401) return throwError(() => error);
    return auth.refresh().pipe(
      catchError(refreshError => {
        auth.clearSession();
        return throwError(() => refreshError);
      }),
      switchMap(result => next(request.clone({ setHeaders: { Authorization: `Bearer ${result.token}` } })))
    );
  }));
};

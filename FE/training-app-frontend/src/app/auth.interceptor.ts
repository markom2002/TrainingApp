import { API_BASE_URL } from './api.config';
import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError, TimeoutError } from 'rxjs';
import { AuthService } from './services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  if (
    !request.url.startsWith(`${API_BASE_URL}/`) ||
    request.url.startsWith(`${API_BASE_URL}/auth/`)
  ) {
    return next(request);
  }
  const token = auth.getToken();
  const authorized = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  return next(authorized).pipe(
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401)
        return throwError(() => error);
      return auth.refresh().pipe(
        catchError((refreshError) => {
          if (refreshError.status !== 0 && !(refreshError instanceof TimeoutError)) auth.clearSession();
          return throwError(() => refreshError);
        }),
        switchMap((result) => {
          const owner=request.headers.get('X-Offline-Account');
          if(owner && owner !== localStorage.getItem('form.offlineAccount'))return throwError(()=>new Error('Account changed; saved workouts were not sent.'));
          return next(
            request.clone({
              setHeaders: { Authorization: `Bearer ${result.token}` },
            }),
          );
        }),
      );
    }),
  );
};

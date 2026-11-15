import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { defer, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { DemoStore } from './demo-store';

export const pagesDemoInterceptor: HttpInterceptorFn = (request, next) => {
  if (!environment.pagesDemo || !request.url.startsWith('/api/')) return next(request);
  const store = inject(DemoStore);
  return defer(() => {
    try { return of(new HttpResponse({ status: request.method === 'DELETE' ? 204 : 200, body: store.handle(request) })); }
    catch (error) { return throwError(() => error instanceof HttpErrorResponse ? error : new HttpErrorResponse({
      status: 503, error: { detail: 'Browser storage is unavailable. Enable site storage to use the demo.' },
    })); }
  });
};

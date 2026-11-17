import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, TimeoutError } from 'rxjs';
import { AuthService } from './services/auth.service';

/** Reopen the journal directly when its HttpOnly refresh session is still valid. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService), router = inject(Router);
  if (auth.isLoggedIn) return router.createUrlTree(['/dashboard']);
  if (!navigator.onLine && localStorage.getItem('form.offlineAccount')) return router.createUrlTree(['/dashboard']);
  return auth.refresh().pipe(map(() => router.createUrlTree(['/dashboard'])), catchError(error => of((error.status === 0 || error instanceof TimeoutError) && localStorage.getItem('form.offlineAccount') ? router.createUrlTree(['/dashboard']) : true)));
};

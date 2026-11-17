import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { catchError, map, of, TimeoutError } from 'rxjs';
import { AuthService } from './services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate() {
    if (this.authService.isLoggedIn) return true;
    if (!navigator.onLine && localStorage.getItem('form.offlineAccount')) return true;
    return this.authService.refresh().pipe(
      map(() => true),
      catchError(error => of((error.status === 0 || error instanceof TimeoutError) && localStorage.getItem('form.offlineAccount') ? true : this.router.createUrlTree(['/login']))),
    );
  }
}

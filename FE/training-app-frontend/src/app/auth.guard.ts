import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate() {
    if (this.authService.isLoggedIn) return true;
    return this.authService.refresh().pipe(
      map(() => true),
      catchError(error => of(error.status === 0 && localStorage.getItem('form.offlineAccount') ? true : this.router.createUrlTree(['/login']))),
    );
  }
}

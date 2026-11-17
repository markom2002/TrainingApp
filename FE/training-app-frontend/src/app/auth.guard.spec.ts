import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError, TimeoutError } from 'rxjs';
import { AuthGuard } from './auth.guard';
import { AuthService } from './services/auth.service';

describe('Installed app offline startup', () => {
  let previous: string | null;
  beforeEach(() => { previous = localStorage.getItem('form.offlineAccount'); localStorage.removeItem('form.offlineAccount'); });
  afterEach(() => { if (previous === null) localStorage.removeItem('form.offlineAccount'); else localStorage.setItem('form.offlineAccount', previous); });
  function guard(refresh: unknown) {
    const auth = { isLoggedIn: false, refresh: jasmine.createSpy().and.returnValue(refresh) };
    TestBed.configureTestingModule({ providers: [AuthGuard, { provide: AuthService, useValue: auth }, { provide: Router, useValue: { createUrlTree: () => '/login' } }] });
    return { auth, guard: TestBed.inject(AuthGuard) };
  }
  it('opens immediately offline after a previous sign-in', () => {
    localStorage.setItem('form.offlineAccount', 'saved-account');
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(false);
    const test = guard(of({}));
    expect(test.guard.canActivate()).toBeTrue();
    expect(test.auth.refresh).not.toHaveBeenCalled();
  });
  it('opens saved local data when Wi-Fi is connected but the laptop times out', async () => {
    localStorage.setItem('form.offlineAccount', 'saved-account');
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
    const result = guard(throwError(() => new TimeoutError())).guard.canActivate();
    expect(isObservable(result) ? await firstValueFrom(result) : result).toBeTrue();
  });
  it('requires sign-in when no offline account has been prepared', async () => {
    const result = guard(throwError(() => new TimeoutError())).guard.canActivate();
    const destination = isObservable(result) ? await firstValueFrom(result) : result;
    expect(destination as unknown).toBe('/login');
  });
});

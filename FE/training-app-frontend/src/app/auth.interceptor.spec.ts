import { API_BASE_URL } from './api.config';
import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './services/auth.service';

const api = API_BASE_URL;

describe('Authentication HTTP flow', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let auth: AuthService;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => requests.verify());

  it('sends the access token only to this API', () => {
    auth.saveToken('access-token');
    http.get(`${api}/trainings`).subscribe();
    const own = requests.expectOne(`${api}/trainings`);
    expect(own.request.headers.get('Authorization')).toBe(
      'Bearer access-token',
    );
    own.flush({ items: [] });
    http.get('https://example.com/data').subscribe();
    const external = requests.expectOne('https://example.com/data');
    expect(external.request.headers.has('Authorization')).toBeFalse();
    external.flush({});
  });

  it('uses credentials for login and stores the returned token in memory', () => {
    auth.login('test@example.com', 'Password123!').subscribe();
    const login = requests.expectOne(`${api}/auth/login`);
    expect(login.request.withCredentials).toBeTrue();
    expect(login.request.headers.has('Authorization')).toBeFalse();
    login.flush({ token: 'new-token', expiresAtUtc: '2026-10-27T18:00:00Z' });
    expect(auth.getToken()).toBe('new-token');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('shares one refresh among concurrent 401s and retries both with the replacement', () => {
    auth.saveToken('old-token');
    let completed = 0;
    http.get(`${api}/trainings`).subscribe(() => completed++);
    http.get(`${api}/admin/summary`).subscribe(() => completed++);
    requests
      .expectOne(`${api}/trainings`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    requests
      .expectOne(`${api}/admin/summary`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    const refresh = requests.expectOne(`${api}/auth/refresh`);
    expect(refresh.request.withCredentials).toBeTrue();
    expect(refresh.request.headers.has('Authorization')).toBeFalse();
    refresh.flush({
      token: 'replacement',
      expiresAtUtc: '2026-10-27T18:00:00Z',
    });
    for (const url of [`${api}/trainings`, `${api}/admin/summary`]) {
      const retry = requests.expectOne(url);
      expect(retry.request.headers.get('Authorization')).toBe(
        'Bearer replacement',
      );
      retry.flush({});
    }
    expect(completed).toBe(2);
    expect(auth.getToken()).toBe('replacement');
  });

  it('clears the session and redirects when refresh fails without looping', () => {
    auth.saveToken('expired');
    let status = 0;
    http
      .get(`${api}/trainings`)
      .subscribe({ error: (error) => (status = error.status) });
    requests
      .expectOne(`${api}/trainings`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    requests
      .expectOne(`${api}/auth/refresh`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
    expect(auth.getToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    requests.expectNone(`${api}/auth/refresh`);
  });

  it('does not refresh on 403 or log out an authenticated user', () => {
    auth.saveToken('user-token');
    let status = 0;
    http
      .get(`${api}/admin/summary`)
      .subscribe({ error: (error) => (status = error.status) });
    requests
      .expectOne(`${api}/admin/summary`)
      .flush({}, { status: 403, statusText: 'Forbidden' });
    requests.expectNone(`${api}/auth/refresh`);
    expect(status).toBe(403);
    expect(auth.getToken()).toBe('user-token');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not retry forever if the request is still unauthorized after refresh', () => {
    let status = 0;
    http
      .get(`${api}/trainings`)
      .subscribe({ error: (error) => (status = error.status) });
    requests
      .expectOne(`${api}/trainings`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    requests.expectOne(`${api}/auth/refresh`).flush({ token: 'replacement' });
    requests
      .expectOne(`${api}/trainings`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    requests.expectNone(`${api}/auth/refresh`);
    expect(status).toBe(401);
  });

  it('revokes the cookie session before clearing local state on logout', () => {
    auth.saveToken('token');
    auth.logout();
    const logout = requests.expectOne(`${api}/auth/logout`);
    expect(logout.request.withCredentials).toBeTrue();
    expect(auth.getToken()).toBe('token');
    logout.flush(null, { status: 204, statusText: 'No Content' });
    expect(auth.getToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});

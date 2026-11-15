import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { pagesDemoInterceptor } from './demo.interceptor';
import { DEMO_STORAGE_KEY } from './demo-store';

describe('Static demo API isolation', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  beforeEach(() => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    environment.pagesDemo = true;
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([pagesDemoInterceptor])), provideHttpClientTesting(),
    ] });
    http = TestBed.inject(HttpClient); requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { environment.pagesDemo = false; requests.verify(); localStorage.removeItem(DEMO_STORAGE_KEY); });

  it('serves local demo requests and rejects unknown API routes without network fallback', () => {
    let token = '';
    http.post<any>('/api/auth/demo', {}).subscribe(body => token = body.token);
    expect(token).toBeTruthy();
    let status = 0;
    http.get('/api/unknown-action').subscribe({ error: error => status = error.status });
    expect(status).toBe(404);
    requests.expectNone(() => true);
  });

  it('leaves real application requests to the real API when demo mode is disabled', () => {
    environment.pagesDemo = false;
    http.post('/api/auth/demo', {}).subscribe();
    requests.expectOne('/api/auth/demo').flush({ token: 'real-api-response' });
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBeNull();
  });
});

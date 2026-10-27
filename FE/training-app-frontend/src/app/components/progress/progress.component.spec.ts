import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ProgressComponent } from './progress.component';
import { API_BASE_URL } from '../../api.config';

describe('Monthly progress', () => {
  it('loads current month automatically and renders returned statistics', () => {
    TestBed.configureTestingModule({ imports: [ProgressComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    const fixture = TestBed.createComponent(ProgressComponent);
    const requests = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    requests.expectOne(r => r.url.startsWith(`${API_BASE_URL}/trainings/month?`)).flush([{ week: 1, count: 3, totalDuration: 135, avgIntensity: 7, avgFatigue: 5 }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('135 min');
    expect(fixture.nativeElement.querySelector('.empty-card')).toBeNull();
    requests.verify();
    fixture.destroy();
  });

  it('distinguishes an API error from an empty month', () => {
    TestBed.configureTestingModule({ imports: [ProgressComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    const fixture = TestBed.createComponent(ProgressComponent);
    const requests = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    requests.expectOne(r => r.url.startsWith(`${API_BASE_URL}/trainings/month?`)).flush({ detail: 'Statistics unavailable.' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Statistics unavailable.');
    expect(fixture.nativeElement.querySelector('.empty-card')).toBeNull();
    requests.verify();
    fixture.destroy();
  });
});

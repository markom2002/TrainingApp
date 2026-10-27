import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { API_BASE_URL } from '../../api.config';
import { DashboardOverview } from '../../models/training.model';

const populated: DashboardOverview = {
  year: 2026,
  month: 1,
  workouts: 5,
  minutes: 150,
  calories: 500,
  averageIntensity: 3,
  averageFatigue: 5,
  previousWorkouts: 0,
  workoutChangePercent: null,
  weeklyActivity: [{ week: 1, workouts: 5, minutes: 150 }],
  exerciseBreakdown: [{ exerciseType: 'Cardio', workouts: 5, minutes: 150 }],
};

describe('Dashboard', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let requests: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.componentInstance.period = '2026-01';
    requests = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    requests
      .expectOne(`${API_BASE_URL}/profile`)
      .flush({ displayName: 'Athlete', weeklyWorkouts: 0, weeklyGoal: 3 });
    requests
      .expectOne((r) => r.url === `${API_BASE_URL}/trainings`)
      .flush({
        items: [],
        page: 1,
        pageSize: 10,
        totalPages: 0,
        totalCount: 0,
      });
  });
  afterEach(() => {
    fixture.destroy();
    requests.verify();
  });

  it('shows real monthly totals and fills missing weeks with zero activity', () => {
    requests
      .expectOne(
        (r) =>
          r.url === `${API_BASE_URL}/trainings/overview` &&
          r.params.get('month') === '1',
      )
      .flush(populated);
    fixture.detectChanges();
    const metrics = fixture.nativeElement.querySelector('.metrics').textContent;
    expect(metrics).toContain('150');
    expect(metrics).toContain('500');
    expect(fixture.nativeElement.querySelectorAll('.chart-column').length).toBe(
      5,
    );
    expect(fixture.componentInstance.weeks[1].minutes).toBe(0);
    expect(fixture.nativeElement.textContent).toContain(
      'No workouts in the previous month',
    );
  });

  it('shows a useful empty state without invented averages', () => {
    requests
      .expectOne((r) => r.url.endsWith('/overview'))
      .flush({
        ...populated,
        workouts: 0,
        minutes: 0,
        calories: 0,
        averageIntensity: 0,
        averageFatigue: 0,
        weeklyActivity: [],
        exerciseBreakdown: [],
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('A fresh start.');
    expect(fixture.nativeElement.querySelectorAll('.mix-row').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.encouragement')).toBeNull();
  });

  it('does not leave stale totals visible after a loading error', () => {
    requests.expectOne((r) => r.url.endsWith('/overview')).flush(populated);
    fixture.detectChanges();
    fixture.componentInstance.period = '2026-02';
    fixture.componentInstance.loadOverview();
    requests
      .expectOne(
        (r) => r.url.endsWith('/overview') && r.params.get('month') === '2',
      )
      .flush(
        { detail: 'Please retry.' },
        { status: 500, statusText: 'Server Error' },
      );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.metrics')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[role=alert]').textContent,
    ).toContain('Please retry.');
  });
});

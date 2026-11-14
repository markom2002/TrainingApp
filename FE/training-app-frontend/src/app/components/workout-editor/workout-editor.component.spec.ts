import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  ActivatedRoute,
  convertToParamMap,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { WorkoutEditorComponent } from './workout-editor.component';
import { API_BASE_URL } from '../../api.config';

describe('Workout editor', () => {
  it('repeats exercise sets into a new workout without copying the old date or notes', async () => {
    TestBed.configureTestingModule({
      imports: [WorkoutEditorComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({ repeat: '7' }),
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(WorkoutEditorComponent);
    const requests = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const original = {
      exerciseType: 'Strength',
      durationMinutes: 60,
      trainingDate: '2020-01-01T12:00:00Z',
      notes: 'Old private notes',
      trainingVariant: 'Unisex',
      exercises: [
        {
          exerciseId: 'bench-press',
          sets: 1,
          reps: 8,
          durationSeconds: null,
          weightKg: 45,
          setEntries: [{ reps: 8, durationSeconds: null, weightKg: 45 }],
        },
      ],
    };
    requests.expectOne(`${API_BASE_URL}/trainings/7`).flush(original);
    fixture.detectChanges();
    await fixture.whenStable();
    requests.expectOne(`${API_BASE_URL}/exercises`).flush([
      {
        id: 'bench-press',
        name: 'Bench press',
        muscleGroup: 'Chest',
        equipment: 'Barbell',
        timed: false,
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.trainingId).toBeUndefined();
    expect(fixture.componentInstance.repeatedWorkout).toBeTrue();
    expect(fixture.componentInstance.formModel.notes).toBe('');
    expect(
      fixture.componentInstance.formModel.trainingDate.startsWith('2020'),
    ).toBeFalse();
    expect(
      fixture.componentInstance.formModel.exercises[0].setEntries![0].weightKg,
    ).toBe(45);
    fixture.componentInstance.formModel.exercises[0].setEntries![0].weightKg = 50;
    expect(original.exercises[0].setEntries[0].weightKg).toBe(45);
    requests.verify();
    fixture.destroy();
  });
  it('submits selected exercises and the chosen variant with the workout', async () => {
    TestBed.configureTestingModule({
      imports: [WorkoutEditorComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const fixture = TestBed.createComponent(WorkoutEditorComponent);
    const requests = TestBed.inject(HttpTestingController);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(
      Promise.resolve(true),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    requests.expectOne(`${API_BASE_URL}/exercises`).flush([
      {
        id: 'bench-press',
        name: 'Bench press',
        muscleGroup: 'Chest',
        equipment: 'Barbell',
        timed: false,
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.formModel.trainingVariant = 'Women';
    fixture.nativeElement.querySelector('.exercise-option').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    requests.expectOne(`${API_BASE_URL}/journey`).flush({});
    const save = requests.expectOne(`${API_BASE_URL}/trainings`);
    expect(save.request.method).toBe('POST');
    expect(save.request.body.trainingVariant).toBe('Women');
    expect(save.request.body.exercises[0].exerciseId).toBe('bench-press');
    expect(save.request.body.exercises[0].sets).toBe(3);
    save.flush({ id: 99 });
    expect(navigate).toHaveBeenCalledWith(['/dashboard'], {
      queryParams: { saved: '1' },
    });
    requests.verify();
    fixture.destroy();
  });
});

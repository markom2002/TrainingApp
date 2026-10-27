import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { WorkoutEditorComponent } from './workout-editor.component';
import { API_BASE_URL } from '../../api.config';

describe('Workout editor', () => {
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
    const save = requests.expectOne(`${API_BASE_URL}/trainings`);
    expect(save.request.method).toBe('POST');
    expect(save.request.body.trainingVariant).toBe('Women');
    expect(save.request.body.exercises[0].exerciseId).toBe('bench-press');
    expect(save.request.body.exercises[0].sets).toBe(3);
    save.flush({ id: 99 });
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    requests.verify();
    fixture.destroy();
  });
});

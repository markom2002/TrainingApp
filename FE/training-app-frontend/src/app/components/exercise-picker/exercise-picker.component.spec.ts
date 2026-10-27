import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ExercisePickerComponent } from './exercise-picker.component';
import { WorkoutExercise } from '../../models/exercise.model';
import { API_BASE_URL } from '../../api.config';

const catalog = [
  {
    id: 'bench-press',
    name: 'Bench press',
    muscleGroup: 'Chest',
    equipment: 'Barbell',
    timed: false,
  },
  {
    id: 'plank',
    name: 'Plank',
    muscleGroup: 'Core',
    equipment: 'Bodyweight',
    timed: true,
  },
];
@Component({
  standalone: true,
  imports: [FormsModule, ExercisePickerComponent],
  template:
    '<form><app-exercise-picker name="exercises" [(ngModel)]="exercises" [variant]="variant" /></form>',
})
class Host {
  exercises: WorkoutExercise[] = [];
  variant = 'Women';
}

describe('Exercise picker', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(Host);
    const requests = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    requests.expectOne(`${API_BASE_URL}/exercises`).flush(catalog);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, requests };
  }
  it('selects exercises and makes the parent form invalid for an invalid set count', async () => {
    const { fixture, requests } = await setup();
    (
      fixture.nativeElement.querySelector(
        '.exercise-option',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.exercises[0].exerciseId).toBe(
      'bench-press',
    );
    const sets = fixture.nativeElement.querySelector(
      'input[aria-label="Sets for bench-press"]',
    ) as HTMLInputElement;
    sets.value = '0';
    sets.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    const form = fixture.debugElement
      .query(By.directive(NgForm))
      .injector.get(NgForm);
    expect(form.invalid).toBeTrue();
    sets.value = '4';
    sets.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(form.valid).toBeTrue();
    expect(fixture.componentInstance.exercises[0].sets).toBe(4);
    requests.verify();
    fixture.destroy();
  });
  it('uses seconds for timed exercises and preserves selection across body variants', async () => {
    const { fixture, requests } = await setup();
    (
      fixture.nativeElement.querySelectorAll(
        '.exercise-option',
      )[1] as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.exercises[0].durationSeconds).toBe(30);
    expect(fixture.componentInstance.exercises[0].reps).toBeNull();
    fixture.componentInstance.variant = 'Men';
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('.exercise-option').length,
    ).toBe(2);
    expect(fixture.componentInstance.exercises.length).toBe(1);
    expect(
      fixture.nativeElement.querySelector(
        'input[aria-label="Seconds for plank"]',
      ),
    ).not.toBeNull();
    requests.verify();
    fixture.destroy();
  });
  it('filters by muscle group and search without deleting selected exercises', async () => {
    const { fixture, requests } = await setup();
    (
      fixture.nativeElement.querySelector(
        '.exercise-option',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await fixture.whenStable();
    const core = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.muscle-filters button',
      ) as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.trim() === 'Core')!;
    core.click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('.exercise-option').length,
    ).toBe(1);
    expect(
      fixture.nativeElement.querySelector('.exercise-option').textContent,
    ).toContain('Plank');
    expect(fixture.componentInstance.exercises[0].exerciseId).toBe(
      'bench-press',
    );
    requests.verify();
    fixture.destroy();
  });
});

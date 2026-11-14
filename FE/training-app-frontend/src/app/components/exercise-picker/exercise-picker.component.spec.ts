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
  let originalUnit: string | null;
  let originalExerciseUnits: string | null;
  beforeEach(() => {
    originalUnit = localStorage.getItem('form.weightUnit');
    originalExerciseUnits = localStorage.getItem('form.exerciseWeightUnits');
    localStorage.removeItem('form.exerciseWeightUnits');
    localStorage.removeItem('form.weightUnit');
  });
  afterEach(() => {
    if (originalUnit === null) localStorage.removeItem('form.weightUnit');
    else localStorage.setItem('form.weightUnit', originalUnit);
    if (originalExerciseUnits === null) localStorage.removeItem('form.exerciseWeightUnits');
    else localStorage.setItem('form.exerciseWeightUnits', originalExerciseUnits);
  });
  it('preserves distinct set values, copies the last set and validates every set', async () => {
    const { fixture, requests } = await setup();
    fixture.nativeElement.querySelector('.exercise-option').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.individual-sets-toggle').click();
    fixture.detectChanges();
    await fixture.whenStable();
    const picker = fixture.debugElement.query(
      By.directive(ExercisePickerComponent),
    ).componentInstance as ExercisePickerComponent;
    const entry = picker.selected[0];
    entry.setEntries![0].reps = 8;
    entry.setEntries![0].weightKg = 42.5;
    entry.setEntries![2].reps = 6;
    entry.setEntries![2].weightKg = 50;
    picker.addSet(entry);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.exercises[0].sets).toBe(4);
    expect(fixture.componentInstance.exercises[0].weightKg).toBe(50);
    expect(entry.setEntries![3].reps).toBe(6);
    expect(entry.setEntries![3]).not.toBe(entry.setEntries![2]);
    entry.setEntries![3].reps = 0;
    picker.update();
    fixture.detectChanges();
    await fixture.whenStable();
    const form = fixture.debugElement
      .query(By.directive(NgForm))
      .injector.get(NgForm);
    expect(form.invalid).toBeTrue();
    entry.setEntries![3].reps = 7;
    picker.update();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(form.valid).toBeTrue();
    picker.removeSet(entry, 3);
    expect(entry.sets).toBe(3);
    requests.verify();
    fixture.destroy();
  });
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
  it('accepts pounds in the input and emits kilograms without unit-switch drift', async () => {
    const { fixture, requests } = await setup();
    fixture.nativeElement.querySelector('.exercise-option').click();
    fixture.detectChanges(); await fixture.whenStable();
    const picker = fixture.debugElement.query(By.directive(ExercisePickerComponent)).componentInstance as ExercisePickerComponent;
    const lbs = fixture.nativeElement.querySelectorAll('.inline-weight-unit button')[1] as HTMLButtonElement;
    lbs.click(); fixture.detectChanges(); await fixture.whenStable();
    const weight = fixture.nativeElement.querySelector('input[aria-label="Weight (lbs) for bench-press"]') as HTMLInputElement;
    weight.value = '135.5'; weight.dispatchEvent(new Event('input'));
    fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.componentInstance.exercises[0].weightKg).toBe(61.46);
    expect(weight.value).toBe('135.5');
    for (let i = 0; i < 10; i++) { picker.setWeightUnit('kg', picker.selected[0]); picker.setWeightUnit('lbs', picker.selected[0]); }
    expect(picker.displayWeight(picker.selected[0])).toBe(135.5);
    expect(picker.selected[0].weightKg).toBe(61.46);
    requests.verify(); fixture.destroy();
  });
  it('converts each individual set and preserves the last pounds value when adding a set', async () => {
    const { fixture, requests } = await setup();
    const picker = fixture.debugElement.query(By.directive(ExercisePickerComponent)).componentInstance as ExercisePickerComponent;
    picker.toggle(catalog[0]); picker.setWeightUnit('lbs', picker.selected[0]);
    const entry = picker.selected[0];
    picker.setWeight(entry, 100);
    picker.individualSets(entry);
    picker.setWeight(entry.setEntries![1], 120, entry);
    picker.setWeight(entry.setEntries![2], 135.5, entry);
    picker.addSet(entry);
    fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.componentInstance.exercises[0].setEntries!.map(s => s.weightKg)).toEqual([45.36, 54.43, 61.46, 61.46]);
    expect(entry.weightKg).toBe(61.46);
    expect(picker.displayWeight(entry.setEntries![3], entry)).toBe(135.5);
    expect(picker.validate()).toBeNull();
    picker.setWeightUnit('kg', picker.selected[0]);
    expect(picker.displayWeight(entry.setEntries![0], entry)).toBe(45.36);
    expect(entry.setEntries![0].weightKg).toBe(45.36);
    requests.verify(); fixture.destroy();
  });
  it('keeps edited and repeated weights unchanged when switching units', async () => {
    const { fixture, requests } = await setup();
    const picker = fixture.debugElement.query(By.directive(ExercisePickerComponent)).componentInstance as ExercisePickerComponent;
    const saved: WorkoutExercise[] = [{exerciseId:'bench-press', sets:2, reps:8, durationSeconds:null, weightKg:100, setEntries:[{reps:8,durationSeconds:null,weightKg:85},{reps:6,durationSeconds:null,weightKg:100}]}];
    picker.writeValue(saved); picker.setWeightUnit('lbs', picker.selected[0]);
    expect(picker.displayWeight(picker.selected[0])).toBe(220.46);
    expect(picker.displayWeight(picker.selected[0].setEntries![0], picker.selected[0])).toBe(187.39);
    picker.setWeightUnit('kg', picker.selected[0]);
    expect(picker.selected[0].setEntries!.map(s => s.weightKg)).toEqual([85,100]);
    expect(saved[0].weightKg).toBe(100);
    requests.verify(); fixture.destroy();
  });
  it('validates empty, negative, excessive and over-precise pound inputs', async () => {
    const { fixture, requests } = await setup();
    const picker = fixture.debugElement.query(By.directive(ExercisePickerComponent)).componentInstance as ExercisePickerComponent;
    picker.toggle(catalog[0]); picker.setWeightUnit('lbs', picker.selected[0]);
    for (const value of [null, -1, 2204.63, 100.123]) {
      picker.setWeight(picker.selected[0], value);
      fixture.detectChanges(); await fixture.whenStable();
      expect(picker.validate()).withContext(String(value)).not.toBeNull();
    }
    picker.setWeight(picker.selected[0], 2204.62);
    expect(picker.selected[0].weightKg).toBe(1000);
    expect(picker.validate()).toBeNull();
    picker.setWeight(picker.selected[0], 0);
    expect(picker.selected[0].weightKg).toBe(0);
    requests.verify(); fixture.destroy();
  });
  it('keeps units independent across exercises, individual sets, reordering and saved values', async () => {
    const { fixture, requests } = await setup();
    const picker = fixture.debugElement.query(By.directive(ExercisePickerComponent)).componentInstance as ExercisePickerComponent;
    picker.toggle(catalog[0]); picker.toggle(catalog[1]);
    const [bench, plank] = picker.selected;
    picker.setWeight(plank, 20);
    fixture.detectChanges(); await fixture.whenStable();
    const pounds = fixture.nativeElement.querySelector('[aria-label="Weight unit for bench-press"] button:last-child') as HTMLButtonElement;
    pounds.click(); fixture.detectChanges(); await fixture.whenStable();
    expect(picker.getWeightUnit(bench)).toBe('lbs');
    expect(picker.getWeightUnit(plank)).toBe('kg');
    expect(fixture.nativeElement.querySelector('input[aria-label="Weight (kg) for plank"]').value).toBe('20');
    expect(fixture.nativeElement.querySelector('input[aria-label="Weight (lbs) for bench-press"]').max).toBe('2204.62');
    picker.setWeight(bench, 135.5);
    picker.individualSets(bench);
    picker.setWeight(bench.setEntries![2], 140, bench);
    picker.addSet(bench);
    picker.move(0, 1);
    expect(picker.displayWeight(bench.setEntries![3], bench)).toBe(140);
    expect(picker.displayWeight(plank)).toBe(20);
    picker.setWeightUnit('lbs'); // Only the default for future selections changes.
    expect(picker.getWeightUnit(plank)).toBe('kg');
    picker.setDisabledState(true);
    picker.setWeightUnit('kg', bench);
    expect(picker.getWeightUnit(bench)).toBe('lbs');
    picker.setDisabledState(false);
    fixture.detectChanges(); await fixture.whenStable();
    const saved = fixture.componentInstance.exercises;
    expect(saved.find(e => e.exerciseId === 'plank')!.weightKg).toBe(20);
    expect(saved.find(e => e.exerciseId === 'bench-press')!.setEntries!.map(s => s.weightKg)).toEqual([61.46, 61.46, 63.5, 63.5]);
    picker.writeValue(saved);
    expect(picker.getWeightUnit(picker.selected[0])).toBe('kg');
    expect(picker.getWeightUnit(picker.selected[1])).toBe('lbs');
    picker.remove('bench-press'); picker.toggle(catalog[0]);
    expect(picker.getWeightUnit(picker.selected[1])).toBe('lbs');
    expect(JSON.parse(localStorage.getItem('form.exerciseWeightUnits')!)['bench-press']).toBe('lbs');
    expect(picker.validate()).toBeNull();
    requests.verify(); fixture.destroy();
  });
  it('restores the saved original unit and exact pounds when editing, and emits unit-only changes', async () => {
    const { fixture, requests } = await setup();
    const picker = fixture.debugElement.query(By.directive(ExercisePickerComponent)).componentInstance as ExercisePickerComponent;
    picker.writeValue([{exerciseId:'bench-press',sets:1,reps:8,durationSeconds:null,weightKg:13.61,weightUnit:'lbs',weightValue:30,
      setEntries:[{reps:8,durationSeconds:null,weightKg:13.61,weightValue:30}]}]);
    const entry=picker.selected[0];
    expect(picker.getWeightUnit(entry)).toBe('lbs');
    expect(picker.displayWeight(entry.setEntries![0],entry)).toBe(30);
    const emitted=jasmine.createSpy();picker.registerOnChange(emitted);
    picker.setWeightUnit('kg',entry);
    expect(emitted.calls.mostRecent().args[0][0].weightUnit).toBe('kg');
    expect(emitted.calls.mostRecent().args[0][0].setEntries[0].weightValue).toBe(13.61);
    picker.setWeightUnit('lbs',entry);
    expect(emitted.calls.mostRecent().args[0][0].setEntries[0].weightValue).toBe(30);
    expect(entry.weightKg).toBe(13.61);
    requests.verify();fixture.destroy();
  });
  it('remembers pounds and respects the disabled state', async () => {
    localStorage.setItem('form.weightUnit', 'lbs');
    const { fixture, requests } = await setup();
    const picker = fixture.debugElement.query(By.directive(ExercisePickerComponent)).componentInstance as ExercisePickerComponent;
    expect(picker.weightUnit).toBe('lbs');
    picker.setWeightUnit('kg');
    expect(localStorage.getItem('form.weightUnit')).toBe('kg');
    picker.toggle(catalog[0]); picker.setDisabledState(true);
    picker.setWeightUnit('lbs'); picker.setWeight(picker.selected[0], 50);
    expect(picker.weightUnit).toBe('kg');
    expect(picker.selected[0].weightKg).toBe(0);
    requests.verify(); fixture.destroy();
  });
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

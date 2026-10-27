import { WORKOUT_PRESETS } from '../../models/workout-presets';
import { Component, Input, forwardRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  ValidationErrors,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  ExerciseDefinition,
  WorkoutExercise,
} from '../../models/exercise.model';
import { ExerciseService } from '../../services/exercise.service';
import { apiErrorMessage } from '../../services/api-error';
@Component({
  selector: 'app-exercise-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exercise-picker.component.html',
  styleUrls: [
    './exercise-picker.component.css',
    './exercise-session.css',
    './exercise-library-impact.css',
    './exercise-session-impact.css',
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ExercisePickerComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ExercisePickerComponent),
      multi: true,
    },
  ],
})
export class ExercisePickerComponent
  implements OnInit, OnDestroy, ControlValueAccessor, Validator
{
  @Input() variant = 'Unisex';
  catalog: ExerciseDefinition[] = [];
  selected: WorkoutExercise[] = [];
  group = 'All';
  search = '';
  loading = true;
  error = '';
  disabled = false;
  bodySide = 'Front';
  selectGroup(group: string) {
    this.group = group;
    this.bodySide = [
      'Back',
      'Glutes',
      'Hamstrings',
      'Triceps',
      'Calves',
    ].includes(group)
      ? 'Back'
      : 'Front';
  }
  readonly groups = [
    'All',
    'Chest',
    'Back',
    'Shoulders',
    'Biceps',
    'Triceps',
    'Forearms',
    'Quads',
    'Hamstrings',
    'Glutes',
    'Calves',
    'Core',
    'Full body',
    'Cardio',
    'Mobility',
  ];
  private request?: Subscription;
  private change: (value: WorkoutExercise[]) => void = () => {};
  private touched = () => {};
  private validationChanged = () => {};
  constructor(private service: ExerciseService) {}
  ngOnInit() {
    this.load();
  }
  ngOnDestroy() {
    this.request?.unsubscribe();
  }
  load() {
    this.loading = true;
    this.error = '';
    this.request = this.service.getCatalog().subscribe({
      next: (catalog) => {
        this.catalog = catalog;
        this.loading = false;
        this.validationChanged();
      },
      error: (error) => {
        this.error = apiErrorMessage(error);
        this.loading = false;
      },
    });
  }
  writeValue(value: WorkoutExercise[] | null) {
    this.selected = (value ?? [])
      .map((e) => ({ ...e }))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  registerOnChange(fn: (value: WorkoutExercise[]) => void) {
    this.change = fn;
  }
  registerOnTouched(fn: () => void) {
    this.touched = fn;
  }
  registerOnValidatorChange(fn: () => void) {
    this.validationChanged = fn;
  }
  setDisabledState(disabled: boolean) {
    this.disabled = disabled;
  }
  validate(): ValidationErrors | null {
    if (
      this.selected.length > 40 ||
      this.selected.some(
        (e) =>
          !Number.isInteger(e.sets) ||
          e.sets < 1 ||
          e.sets > 30 ||
          !Number.isFinite(e.weightKg) ||
          e.weightKg < 0 ||
          e.weightKg > 1000 ||
          Math.abs(e.weightKg * 100 - Math.round(e.weightKg * 100)) > 1e-7 ||
          (this.definition(e.exerciseId)?.timed
            ? !Number.isInteger(e.durationSeconds) ||
              e.durationSeconds! < 1 ||
              e.durationSeconds! > 7200
            : !Number.isInteger(e.reps) || e.reps! < 1 || e.reps! > 200),
      )
    )
      return { exerciseDetails: true };
    return null;
  }
  get visible() {
    const search = this.search.toLowerCase().trim();
    return this.catalog.filter(
      (e) =>
        (this.group === 'All' || e.muscleGroup === this.group) &&
        `${e.name} ${e.muscleGroup} ${e.equipment}`
          .toLowerCase()
          .includes(search),
    );
  }
  definition(id: string) {
    return this.catalog.find((e) => e.id === id);
  }
  has(id: string) {
    return this.selected.some((e) => e.exerciseId === id);
  }
  toggle(exercise: ExerciseDefinition) {
    if (this.disabled) return;
    if (this.has(exercise.id))
      this.selected = this.selected.filter((e) => e.exerciseId !== exercise.id);
    else if (this.selected.length < 40)
      this.selected = [
        ...this.selected,
        {
          exerciseId: exercise.id,
          sets: 3,
          reps: exercise.timed ? null : 10,
          durationSeconds: exercise.timed ? 30 : null,
          weightKg: 0,
        },
      ];
    this.update();
  }
  remove(id: string) {
    if (this.disabled) return;
    this.selected = this.selected.filter((e) => e.exerciseId !== id);
    this.update();
  }
  update() {
    this.change(this.selected.map((e, i) => ({ ...e, position: i })));
    this.touched();
    this.validationChanged();
  }
  quickAdd(kind: string) {
    const ids = WORKOUT_PRESETS[kind] ?? [];
    ids.forEach((id) => {
      const exercise = this.definition(id);
      if (exercise && !this.has(id)) this.toggle(exercise);
    });
  }
  move(index: number, direction: number) {
    const to = index + direction;
    if (this.disabled || to < 0 || to >= this.selected.length) return;
    [this.selected[index], this.selected[to]] = [
      this.selected[to],
      this.selected[index],
    ];
    this.update();
  }
}

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
  WorkoutSet,
} from '../../models/exercise.model';
import { ExerciseService } from '../../services/exercise.service';
import { MovementGuideComponent } from './movement-guide.component';
import { apiErrorMessage } from '../../services/api-error';
type WeightUnit = 'kg' | 'lbs';
type WeightEntry = Pick<WorkoutSet, 'weightKg' | 'weightValue'>;
const KG_PER_LB = 0.45359237;
@Component({
  selector: 'app-exercise-picker',
  standalone: true,
  imports: [CommonModule, FormsModule,MovementGuideComponent],
  templateUrl: './exercise-picker.component.html',
  styleUrls: [
    './exercise-picker.component.css',
    './exercise-session.css',
    './exercise-library-impact.css',
    './exercise-session-impact.css',
    './individual-sets.css',
    './weight-units.css',
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
  weightUnit: WeightUnit = this.readWeightUnit();
  readonly weightUnits = ['kg', 'lbs'] as const;
  private exerciseUnits = this.readExerciseUnits();
  private weightInputs = new WeakMap<WeightEntry, { unit: WeightUnit; value: number | null; kg: number }>();
  bodySide = 'Front';
  preview?:ExerciseDefinition;
  guideOpen=false;
  entryMode: 'log' | 'guide' = 'log';
  showAllExercises = false;
  get recentExercises() {
    try { return JSON.parse(localStorage.getItem('form.recentExercises') ?? '[]') as string[]; } catch { return []; }
  }
  logRecent() {
    try { localStorage.setItem('form.recentExercises', JSON.stringify([...new Set([...this.selected.map(e => e.exerciseId), ...this.recentExercises])].slice(0, 12))); } catch {}
  }
  editSelected(){document.getElementById('session-lineup')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
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
      .map((e) => ({
        ...e,
        setEntries: e.setEntries?.length
          ? e.setEntries.map((s) => ({ ...s }))
          : [],
      }))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    this.selected.forEach((entry) => {
      if (entry.weightUnit) this.exerciseUnits.set(entry.exerciseId, entry.weightUnit);
      else this.initializeWeightUnit(entry.exerciseId);
    });
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
  private readWeightUnit(): WeightUnit {
    try { return localStorage.getItem('form.weightUnit') === 'lbs' ? 'lbs' : 'kg'; }
    catch { return 'kg'; }
  }
  private readExerciseUnits(): Map<string, WeightUnit> {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('form.exerciseWeightUnits') ?? '{}');
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return new Map();
      return new Map(Object.entries(saved).filter((entry): entry is [string, WeightUnit] => entry[1] === 'kg' || entry[1] === 'lbs'));
    } catch { return new Map(); }
  }
  private initializeWeightUnit(id: string) {
    if (!this.exerciseUnits.has(id)) this.exerciseUnits.set(id, this.weightUnit);
  }
  getWeightUnit(entry?: WeightEntry): WeightUnit {
    const id = (entry as WorkoutExercise | undefined)?.exerciseId;
    return (id && this.exerciseUnits.get(id)) || this.weightUnit;
  }
  setWeightUnit(unit: WeightUnit, entry?: WorkoutExercise) {
    if (this.disabled || unit === this.getWeightUnit(entry)) return;
    if (entry) {
      this.exerciseUnits.set(entry.exerciseId, unit);
      try { localStorage.setItem('form.exerciseWeightUnits', JSON.stringify(Object.fromEntries(this.exerciseUnits))); } catch { /* Keep the choice for this session. */ }
      this.update();
    } else {
      this.weightUnit = unit;
      try { localStorage.setItem('form.weightUnit', unit); } catch { /* Keep the choice for this session. */ }
    }
    this.touched();
    this.validationChanged();
  }
  weightLimitFor(entry?: WorkoutExercise) { return this.getWeightUnit(entry) === 'kg' ? 1000 : 2204.62; }
  displayWeight(entry: WeightEntry, exercise?: WorkoutExercise): number | null {
    const unit = this.getWeightUnit(exercise ?? entry);
    const input = this.weightInputs.get(entry);
    if (input?.unit === unit && Object.is(input.kg, entry.weightKg)) return input.value;
    if (!Number.isFinite(entry.weightKg)) return null;
    const storedUnit = (exercise ?? entry as WorkoutExercise).weightUnit;
    if (storedUnit === unit && entry.weightValue != null) {
      const kg = unit === 'lbs' ? Math.round(entry.weightValue * KG_PER_LB * 100) / 100 : entry.weightValue;
      if (kg === entry.weightKg) return entry.weightValue;
    }
    return unit === 'kg' ? entry.weightKg : Math.round(entry.weightKg / KG_PER_LB * 100) / 100;
  }
  setWeight(entry: WeightEntry, value: number | null, exercise?: WorkoutExercise) {
    if (this.disabled) return;
    const unit = this.getWeightUnit(exercise ?? entry);
    const limit = unit === 'kg' ? 1000 : 2204.62;
    const valid = value !== null && Number.isFinite(value) && value >= 0 && value <= limit &&
      Math.abs(value * 100 - Math.round(value * 100)) < 1e-7;
    entry.weightKg = valid
      ? (unit === 'kg' ? value : Math.round(value * KG_PER_LB * 100) / 100)
      : NaN;
    this.weightInputs.set(entry, { unit, value, kg: entry.weightKg });
    this.update();
  }
  private copyWeightInput(from: WeightEntry, to: WeightEntry) {
    if (from.weightValue != null) to.weightValue = from.weightValue;
    const input = this.weightInputs.get(from);
    if (input && Object.is(input.kg, from.weightKg)) this.weightInputs.set(to, { ...input });
  }
  validate(): ValidationErrors | null {
    if (
      this.selected.some(
        (e) =>
          e.setEntries?.length &&
          (e.setEntries.length !== e.sets ||
            e.setEntries.some(
              (s) => !this.validSet(s, !!this.definition(e.exerciseId)?.timed),
            )),
      )
    )
      return { exerciseDetails: true };
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
    this.preview=exercise;
    if (this.disabled) return;
    this.initializeWeightUnit(exercise.id);
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
    this.selected.forEach((e) => {
      if (e.setEntries?.length) {
        e.sets = e.setEntries.length;
        e.reps = e.setEntries[0].reps;
        e.durationSeconds = e.setEntries[0].durationSeconds;
        e.weightKg = Math.max(...e.setEntries.map((s) => Number(s.weightKg)));
      }
    });
    this.logRecent();
    this.change(this.selected.map((e, i) => ({
      ...e, position: i, weightUnit: this.getWeightUnit(e),
      weightValue: e.setEntries?.length
        ? Math.max(...e.setEntries.map(s => this.displayWeight(s, e) ?? NaN))
        : this.displayWeight(e),
      setEntries: e.setEntries?.map(s => ({ ...s, weightValue: this.displayWeight(s, e) })),
    })));
    this.touched();
    this.validationChanged();
  }
  private validSet(s: WorkoutSet, timed: boolean) {
    return (
      Number.isFinite(s.weightKg) &&
      s.weightKg >= 0 &&
      s.weightKg <= 1000 &&
      Math.abs(s.weightKg * 100 - Math.round(s.weightKg * 100)) < 1e-7 &&
      (timed
        ? Number.isInteger(s.durationSeconds) &&
          s.durationSeconds! >= 1 &&
          s.durationSeconds! <= 7200 &&
          s.reps === null
        : Number.isInteger(s.reps) &&
          s.reps! >= 1 &&
          s.reps! <= 200 &&
          s.durationSeconds === null)
    );
  }
  individualSets(entry: WorkoutExercise) {
    if (this.disabled) return;
    entry.setEntries = Array.from({ length: entry.sets }, () => {
      const set = { reps: entry.reps, durationSeconds: entry.durationSeconds, weightKg: entry.weightKg };
      this.copyWeightInput(entry, set);
      return set;
    });
    this.update();
  }
  addSet(entry: WorkoutExercise) {
    if (
      this.disabled ||
      !entry.setEntries?.length ||
      entry.setEntries.length >= 30
    )
      return;
    const previous = entry.setEntries[entry.setEntries.length - 1];
    const next = { ...previous };
    this.copyWeightInput(previous, next);
    entry.setEntries.push(next);
    this.update();
  }
  removeSet(entry: WorkoutExercise, index: number) {
    if (this.disabled || !entry.setEntries || entry.setEntries.length <= 1)
      return;
    entry.setEntries.splice(index, 1);
    this.update();
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

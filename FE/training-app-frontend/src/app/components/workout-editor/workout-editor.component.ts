import { ExerciseService } from '../../services/exercise.service';
import { WORKOUT_PRESETS, presetEntries } from '../../models/workout-presets';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { TrainingService } from '../../services/training.service';
import { ExerciseType, Training } from '../../models/training.model';
import { WorkoutExercise } from '../../models/exercise.model';
import { ExercisePickerComponent } from '../exercise-picker/exercise-picker.component';
import { apiErrorMessage } from '../../services/api-error';
@Component({
  selector: 'app-workout-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ExercisePickerComponent],
  templateUrl: './workout-editor.component.html',
  styleUrls: [
    './workout-editor.component.css',
    './workout-fields.css',
    './workout-impact.css',
    './workout-impact-responsive.css',
  ],
})
export class WorkoutEditorComponent implements OnInit, OnDestroy {
  trainingId?: number;
  loading = false;
  loadFailed = false;
  submitting = false;
  errorMessage = '';
  private read?: Subscription;
  private save?: Subscription;
  formModel = {
    exerciseType: ExerciseType.Strength,
    durationMinutes: 45,
    calories: 0,
    intensity: 5,
    fatigue: 5,
    trainingDate: this.localDate(new Date()),
    notes: '',
    trainingVariant: 'Unisex',
    exercises: [] as WorkoutExercise[],
  };
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: TrainingService,
    private exerciseService: ExerciseService,
  ) {}
  get sets() {
    return this.formModel.exercises.reduce((sum, e) => sum + (e.sets || 0), 0);
  }
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadDraft();
      return;
    }
    this.trainingId = Number(id);
    this.loading = true;
    this.read = this.service
      .getById(this.trainingId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          const type =
            typeof data.exerciseType === 'string'
              ? ExerciseType[data.exerciseType as keyof typeof ExerciseType]
              : data.exerciseType;
          this.formModel = {
            exerciseType: type,
            durationMinutes: data.durationMinutes,
            calories: data.calories,
            intensity: data.intensity,
            fatigue: data.fatigue,
            trainingDate: this.localDate(data.trainingDate),
            notes: data.notes ?? '',
            trainingVariant: data.trainingVariant ?? 'Unisex',
            exercises: (data.exercises ?? []).map((e) => ({ ...e })),
          };
        },
        error: (error) => {
          this.loadFailed = true;
          this.errorMessage = apiErrorMessage(error);
        },
      });
  }
  private loadDraft() {
    const focus = this.route.snapshot.queryParamMap.get('focus');
    if (!focus || !Object.prototype.hasOwnProperty.call(WORKOUT_PRESETS, focus))
      return;
    this.loading = true;
    this.read = this.exerciseService
      .getCatalog()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (catalog) =>
          (this.formModel.exercises = presetEntries(focus, catalog)),
        error: (error) => (this.errorMessage = apiErrorMessage(error)),
      });
  }
  ngOnDestroy() {
    this.read?.unsubscribe();
    this.save?.unsubscribe();
  }
  submit(form: NgForm) {
    if (form.invalid || this.submitting) {
      form.control.markAllAsTouched();
      this.errorMessage =
        'Check the session fields and exercise details before saving.';
      return;
    }
    this.errorMessage = '';
    this.submitting = true;
    const workout: Training = {
      ...this.formModel,
      trainingDate: new Date(this.formModel.trainingDate),
    };
    const request = this.trainingId
      ? this.service.update(this.trainingId, workout)
      : this.service.add(workout);
    this.save = request
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (error) => (this.errorMessage = apiErrorMessage(error)),
      });
  }
  private localDate(value: string | Date) {
    const date = new Date(value);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }
}

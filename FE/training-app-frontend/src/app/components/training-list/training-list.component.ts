import { WorkoutExercisesComponent } from '../workout-exercises/workout-exercises.component';
import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { TrainingService } from '../../services/training.service';
import { Training, TrainingQuery } from '../../models/training.model';
import { apiErrorMessage } from '../../services/api-error';

@Component({
  selector: 'app-training-list',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkoutExercisesComponent],
  templateUrl: './training-list.component.html',
  styleUrls: ['./training-list.component.css', './training-list-impact.css'],
})
export class TrainingListComponent implements OnInit, OnDestroy {
  @Output() trainingDeleted = new EventEmitter<void>();
  trainings: Training[] = [];
  page = 1;
  totalPages = 0;
  totalCount = 0;
  loading = false;
  deleting = false;
  errorMessage = '';
  filters = this.defaults();
  private applied = { ...this.filters };
  private request?: Subscription;
  private deletion?: Subscription;

  constructor(
    private trainingService: TrainingService,
    private router: Router,
  ) {}

  private defaults(): TrainingQuery {
    return {
      page: 1,
      pageSize: 10,
      exerciseType: '',
      from: '',
      to: '',
      sortBy: 'trainingDate',
      sortDirection: 'desc',
    };
  }

  get invalidDates(): boolean {
    return !!(
      this.filters.from &&
      this.filters.to &&
      this.filters.from > this.filters.to
    );
  }

  ngOnInit() {
    this.loadTrainings();
  }
  ngOnDestroy() {
    this.request?.unsubscribe();
    this.deletion?.unsubscribe();
  }

  applyFilters(form: NgForm) {
    if (form.invalid || this.invalidDates) return;
    this.applied = { ...this.filters };
    this.loadTrainings(1);
  }

  resetFilters() {
    this.filters = this.defaults();
    this.applied = { ...this.filters };
    this.loadTrainings(1);
  }

  loadTrainings(page = this.page) {
    this.request?.unsubscribe();
    this.loading = true;
    this.errorMessage = '';
    this.request = this.trainingService
      .getAll({ ...this.applied, page })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          // Deleting the last item on a page can move the last available page backwards.
          if (page > Math.max(1, result.totalPages)) {
            queueMicrotask(() =>
              this.loadTrainings(Math.max(1, result.totalPages)),
            );
            return;
          }
          this.trainings = result.items;
          this.page = result.page;
          this.totalCount = result.totalCount;
          this.totalPages = result.totalPages;
        },
        error: (error) => {
          this.trainings = [];
          this.errorMessage = apiErrorMessage(error);
        },
      });
  }

  deleteTraining(id: number) {
    if (
      this.deleting ||
      !confirm('Are you sure you want to delete this training?')
    )
      return;
    this.deleting = true;
    this.deletion = this.trainingService
      .delete(id)
      .pipe(finalize(() => (this.deleting = false)))
      .subscribe({
        next: () => {
          this.loadTrainings();
          this.trainingDeleted.emit();
        },
        error: (error) => (this.errorMessage = apiErrorMessage(error)),
      });
  }

  editTraining(id: number) {
    this.router.navigate(['/edit-training', id]);
  }
}

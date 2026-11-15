import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { API_BASE_URL } from '../../api.config';
import { Training } from '../../models/training.model';
import { TrainingService } from '../../services/training.service';
import { apiErrorMessage } from '../../services/api-error';
import { LiveRefreshService } from '../../services/live-refresh.service';
import { UiIconComponent } from '../ui-icon.component';
import { WorkoutExercisesComponent } from '../workout-exercises/workout-exercises.component';
import { MOVEMENT_GUIDES } from '../exercise-picker/movement-guides';
@Component({
  selector: 'app-training-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiIconComponent,
    WorkoutExercisesComponent,
  ],
  templateUrl: './training-calendar.component.html',
  styleUrls: ['./training-calendar.css'],
})
export class TrainingCalendarComponent implements OnInit, OnDestroy {
  @Output() trainingDeleted = new EventEmitter<void>();
  readonly today = new Date();
  month = `${this.today.getUTCFullYear()}-${String(this.today.getUTCMonth() + 1).padStart(2, '0')}`;
  selected = '';
  items: Training[] = [];
  loading = false;
  error = '';
  deleting = false;
  private synced?: Subscription;
  private savedDate = '';
  private read?: Subscription;
  private mutation?: Subscription;
  constructor(
    private live: LiveRefreshService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private trainings: TrainingService,
  ) {}
  ngOnInit() {
    const date = this.route.snapshot.queryParamMap.get('date');
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      this.savedDate = date;
      this.month = date.slice(0, 7);
    }
    this.synced = this.live.changes.subscribe(() => { if ((!this.read || this.read.closed) && !this.deleting) this.load(true); });
    this.load();
  }
  ngOnDestroy() {
    this.synced?.unsubscribe();
    this.read?.unsubscribe();
    this.mutation?.unsubscribe();
  }
  key(value: Date | string) {
    const d = new Date(value);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  get cells() {
    const [year, month] = this.month.split('-').map(Number);
    if (!year || !month) return [];
    const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const count = new Date(year, month, 0).getDate();
    return Array.from(
      { length: Math.ceil((offset + count) / 7) * 7 },
      (_, i) => {
        const day = i - offset + 1;
        const key = `${this.month}-${String(day).padStart(2, '0')}`;
        return {
          day,
          key,
          inMonth: day > 0 && day <= count,
          trainings: this.items.filter((t) => this.key(t.trainingDate) === key),
        };
      },
    );
  }
  get chosen() {
    return this.items.filter((t) => this.key(t.trainingDate) === this.selected);
  }
  get trainedDays() {
    return new Set(this.items.map((t) => this.key(t.trainingDate))).size;
  }
  parts(items: Training[]) {
    return [
      ...new Set(
        items.flatMap((t) =>
          (t.exercises ?? []).map((e) => {
            const group = MOVEMENT_GUIDES[e.exerciseId]?.group ?? 'Full body';
            return ['Quads', 'Hamstrings', 'Glutes', 'Calves'].includes(group)
              ? 'leg'
              : ['Biceps', 'Triceps', 'Forearms'].includes(group)
                ? 'arm'
                : group === 'Core'
                  ? 'core'
                  : group === 'Cardio'
                    ? 'activity'
                    : group === 'Back'
                      ? 'back'
                      : 'dumbbell';
          }),
        ),
      ),
    ].slice(0, 3);
  }
  load(background = false) {
    const [year, month] = this.month.split('-').map(Number);
    if (
      !Number.isInteger(year) ||
      year < 2 ||
      year > 9998 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      this.error = 'Choose a valid month.';
      return;
    }
    this.read?.unsubscribe();
    this.loading = !background;
    this.error = '';
    if (!background) this.items = [];
    this.read = this.http
      .get<Training[]>(`${API_BASE_URL}/journey/calendar`, {
        params: { year, month },
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (items) => {
          this.items = items;
          if (background && this.selected.startsWith(this.month)) return;
          this.selected = this.savedDate.startsWith(this.month) ? this.savedDate : items.length
            ? this.key(items.at(-1)!.trainingDate)
            : `${this.month}-01`;
        },
        error: (e) => (this.error = apiErrorMessage(e)),
      });
  }
  shift(direction: number) {
    const [y, m] = this.month.split('-').map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    if (d.getFullYear() < 2 || d.getFullYear() > 9998) return;
    this.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.load();
  }
  edit(id: number) {
    this.router.navigate(['/edit-training', id]);
  }
  repeat(id: number) {
    this.router.navigate(['/add-training'], { queryParams: { repeat: id } });
  }
  add() {
    this.router.navigate(['/add-training']);
  }
  remove(id: number) {
    if (this.deleting || !confirm('Delete this workout?')) return;
    this.deleting = true;
    this.mutation = this.trainings
      .delete(id)
      .pipe(finalize(() => (this.deleting = false)))
      .subscribe({
        next: () => {
          this.load();
          this.trainingDeleted.emit();
        },
        error: (e) => (this.error = apiErrorMessage(e)),
      });
  }
}

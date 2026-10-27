import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  WorkoutExercise,
  ExerciseDefinition,
} from '../../models/exercise.model';
import { ExerciseService } from '../../services/exercise.service';
@Component({
  selector: 'app-workout-exercises',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (exercises.length) {
      <details>
        <summary>
          {{ exercises.length }}
          {{ exercises.length === 1 ? 'movement' : 'movements' }} <span>+</span>
        </summary>
        <div class="exercise-record">
          <span class="variant">{{
            variant === 'Unisex'
              ? 'ALL ATHLETES'
              : variant === 'Women'
                ? "WOMEN'S VIEW"
                : "MEN'S VIEW"
          }}</span>
          @for (e of exercises; track e.exerciseId) {
            <div class="record-row">
              <strong>{{ name(e.exerciseId) }}</strong
              ><small>{{ definition(e.exerciseId)?.muscleGroup }}</small>
              <p>
                {{ e.sets }} sets &times;
                {{
                  e.durationSeconds !== null && e.durationSeconds !== undefined
                    ? e.durationSeconds
                    : e.reps
                }}
                {{
                  e.durationSeconds !== null && e.durationSeconds !== undefined
                    ? 'sec'
                    : 'reps'
                }}
                <span
                  >&middot;
                  {{ e.weightKg ? e.weightKg + ' kg' : 'No added load' }}</span
                >
              </p>
            </div>
          }
        </div>
      </details>
    } @else {
      <span class="no-exercises">Session summary</span>
    }
  `,
  styles: [
    `
      details {
        font-size: 14px;
        min-width: 130px;
      }
      summary {
        cursor: pointer;
        list-style: none;
        color: #4f742f;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 7px 9px;
        background: #f1f6e7;
        border-radius: 5px;
      }
      summary::-webkit-details-marker {
        display: none;
      }
      .exercise-record {
        padding: 13px 5px;
        min-width: 180px;
      }
      .variant {
        font-size: 11px;
        letter-spacing: 1px;
        color: #6d8356;
      }
      .record-row {
        padding: 12px 0;
        border-bottom: 1px solid #edf1e4;
      }
      .record-row strong {
        display: block;
        font-size: 14px;
        font-weight: 550;
        color: #355222;
      }
      .record-row small {
        display: block;
        font-size: 12px;
        color: #6d8356;
        margin-top: 5px;
      }
      .record-row p {
        font-size: 13px;
        color: #4e7035;
        margin: 8px 0 0;
      }
      .record-row p span {
        color: #6a8255;
      }
      .no-exercises {
        font-size: 13px;
        color: #6f825c;
      }
    `,
  ],
})
export class WorkoutExercisesComponent implements OnInit, OnDestroy {
  @Input() exercises: WorkoutExercise[] = [];
  @Input() variant = 'Unisex';
  private catalog: ExerciseDefinition[] = [];
  private request?: Subscription;
  constructor(private service: ExerciseService) {}
  ngOnInit() {
    if (this.exercises.length)
      this.request = this.service.getCatalog().subscribe({
        next: (catalog) => (this.catalog = catalog),
        error: () => {},
      });
  }
  ngOnDestroy() {
    this.request?.unsubscribe();
  }
  definition(id: string) {
    return this.catalog.find((e) => e.id === id);
  }
  name(id: string) {
    return this.definition(id)?.name ?? id.replaceAll('-', ' ');
  }
}

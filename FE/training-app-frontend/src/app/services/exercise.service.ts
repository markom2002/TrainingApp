import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { shareReplay } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { ExerciseDefinition } from '../models/exercise.model';
@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private http = inject(HttpClient);
  private catalog$ = this.http
    .get<ExerciseDefinition[]>(`${API_BASE_URL}/exercises`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));
  getCatalog() {
    return this.catalog$;
  }
}

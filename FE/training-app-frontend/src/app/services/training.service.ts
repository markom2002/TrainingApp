import { API_BASE_URL } from '../api.config';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Training,
  PagedResult,
  TrainingQuery,
  DashboardOverview,
  MonthlyTrainingStats,
} from '../models/training.model';

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly apiUrl = `${API_BASE_URL}/trainings`;
  constructor(private http: HttpClient) {}

  // The authentication interceptor owns all Bearer headers and refresh retries.
  add(training: Training) {
    return this.http.post<Training>(this.apiUrl, training);
  }
  update(id: number, training: Training) {
    return this.http.put<Training>(`${this.apiUrl}/${id}`, training);
  }
  delete(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  getById(id: number) {
    return this.http.get<Training>(`${this.apiUrl}/${id}`);
  }

  getAll(query: TrainingQuery) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '')
        params = params.set(key, String(value));
    }
    return this.http.get<PagedResult<Training>>(this.apiUrl, { params });
  }
  getMonthlyStats(year: number, month: number) {
    return this.http.get<MonthlyTrainingStats[]>(`${this.apiUrl}/month`, {
      params: { year, month },
    });
  }
  getOverview(year: number, month: number) {
    return this.http.get<DashboardOverview>(`${this.apiUrl}/overview`, {
      params: { year, month },
    });
  }
}

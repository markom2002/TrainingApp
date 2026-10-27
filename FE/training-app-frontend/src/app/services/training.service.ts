import { API_BASE_URL } from '../api.config';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Training, PagedResult, TrainingQuery } from '../models/training.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TrainingService {

  private apiUrl = `${API_BASE_URL}/trainings`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getAuthHeaders() {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  add(training: Training): Observable<Training> {
    return this.http.post<Training>(this.apiUrl, training, { headers: this.getAuthHeaders() });
  }

  getAll(query: TrainingQuery): Observable<PagedResult<Training>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PagedResult<Training>>(this.apiUrl, { params, headers: this.getAuthHeaders() });
  }

  update(id: number, training: Training): Observable<Training> {
    return this.http.put<Training>(`${this.apiUrl}/${id}`, training, { headers: this.getAuthHeaders() });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  getMonthlyStats(year: number, month: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/month?year=${year}&month=${month}`, { headers: this.getAuthHeaders() });
  }

  getById(id: number) {
  return this.http.get<Training>(
    `${this.apiUrl}/${id}`,
    { headers: this.getAuthHeaders() }
  );
}


}

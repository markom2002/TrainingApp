import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Training } from '../models/training.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TrainingService {

  private apiUrl = 'https://localhost:7089/api/trainings';

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

  getAll(): Observable<Training[]> {
    return this.http.get<Training[]>(this.apiUrl, { headers: this.getAuthHeaders() });
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

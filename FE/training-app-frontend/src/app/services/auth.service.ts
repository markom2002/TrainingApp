import { API_BASE_URL } from '../api.config';
import { jwtDecode } from 'jwt-decode';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, shareReplay, tap } from 'rxjs';

interface TokenResponse { token: string; expiresAtUtc: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${API_BASE_URL}/auth`;
  private token: string | null = null;
  private refreshRequest?: Observable<TokenResponse>;

  constructor(private http: HttpClient, private router: Router) {
    localStorage.removeItem('token');
  }

  register(email: string, password: string, gender: string) {
    return this.http.post(`${this.apiUrl}/register`, { email, password, gender });
  }

  login(email: string, password: string) {
    return this.http.post<TokenResponse>(`${this.apiUrl}/login`, { email, password }, { withCredentials: true })
      .pipe(tap(result => this.saveToken(result.token)));
  }

  refresh(): Observable<TokenResponse> {
    if (!this.refreshRequest) {
      this.refreshRequest = this.http.post<TokenResponse>(`${this.apiUrl}/refresh`, {}, { withCredentials: true }).pipe(
        tap(result => this.saveToken(result.token)),
        finalize(() => this.refreshRequest = undefined),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.refreshRequest;
  }

  saveToken(token: string) { this.token = token; }
  getToken(): string | null { return this.token; }

  clearSession() {
    this.token = null;
    localStorage.removeItem('userEmail');
    this.router.navigate(['/login']);
  }

  logout() {
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => this.clearSession(),
      error: () => alert('Logout failed. Please try again.')
    });
  }

  get role(): string {
    if (!this.token) return '';
    try {
      const claims = jwtDecode<Record<string, unknown>>(this.token);
      return String(claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? 'User');
    } catch { return ''; }
  }

  get isLoggedIn(): boolean { return !!this.token; }
}

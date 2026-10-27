import { API_BASE_URL } from '../../api.config';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { TrainingService } from '../../services/training.service';
import { apiErrorMessage } from '../../services/api-error';
import { DashboardOverview } from '../../models/training.model';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { TrainingListComponent } from '../training-list/training-list.component';

@Component({
  selector: 'app-dashboard', standalone: true,
  imports: [CommonModule, FormsModule, TrainingListComponent],
  templateUrl: './dashboard.component.html', styleUrls: ['./dashboard.component.css', './dashboard-shell.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  username = 'Athlete';
  readonly today = new Date();
  period = `${this.today.getFullYear()}-${String(this.today.getMonth() + 1).padStart(2, '0')}`;
  overview?: DashboardOverview;
  loading = false;
  errorMessage = '';
  adminSummary?: { userCount: number; trainingCount: number };
  adminError = '';
  private request?: Subscription;
  private adminRequest?: Subscription;

  constructor(private router: Router, public authService: AuthService, private http: HttpClient, private trainingService: TrainingService) {}

  ngOnInit() {
    const email = localStorage.getItem('userEmail');
    if (email) this.username = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
    this.loadOverview();
  }
  ngOnDestroy() { this.request?.unsubscribe(); this.adminRequest?.unsubscribe(); }

  loadOverview() {
    this.request?.unsubscribe();
    this.overview = undefined;
    this.errorMessage = '';
    const [year, month] = this.period.split('-').map(Number);
    if (!Number.isInteger(year) || year < 2 || year > 9998 || !Number.isInteger(month) || month < 1 || month > 12) {
      this.errorMessage = 'Choose a valid month.';
      return;
    }
    this.loading = true;
    this.request = this.trainingService.getOverview(year, month).pipe(finalize(() => this.loading = false)).subscribe({
      next: result => this.overview = result,
      error: error => this.errorMessage = apiErrorMessage(error)
    });
  }

  get weeks() {
    if (!this.overview) return [];
    const count = Math.ceil(new Date(this.overview.year, this.overview.month, 0).getDate() / 7);
    const max = Math.max(1, ...this.overview.weeklyActivity.map(w => w.minutes));
    return Array.from({ length: count }, (_, i) => {
      const week = this.overview!.weeklyActivity.find(w => w.week === i + 1);
      return { week: i + 1, minutes: week?.minutes ?? 0, workouts: week?.workouts ?? 0, height: (week?.minutes ?? 0) * 100 / max };
    });
  }

  loadAdminSummary() {
    this.adminRequest?.unsubscribe();
    this.adminError = '';
    this.adminRequest = this.http.get<{ userCount: number; trainingCount: number }>(`${API_BASE_URL}/admin/summary`).subscribe({
      next: result => this.adminSummary = result,
      error: error => this.adminError = apiErrorMessage(error)
    });
  }
  scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  goToProgress() { this.router.navigate(['/progress']); }
  goToAddTraining() { this.router.navigate(['/add-training']); }
  logout() { this.authService.logout(); }
}

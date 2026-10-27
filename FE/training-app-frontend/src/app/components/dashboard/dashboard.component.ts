import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TrainingListComponent } from '../../components/training-list/training-list.component';
import { ProgressComponent } from '../../components/progress/progress.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TrainingListComponent,
    ProgressComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  username: string = '';
  adminSummary?: { userCount: number; trainingCount: number };
  adminError = '';

  loadAdminSummary() {
    this.adminError = '';
    this.http.get<{ userCount: number; trainingCount: number }>('https://localhost:7089/api/admin/summary').subscribe({
      next: result => this.adminSummary = result,
      error: () => this.adminError = 'Unable to load administrator statistics.'
    });
  }

  constructor(private router: Router, public authService: AuthService, private http: HttpClient) {}

  ngOnInit() {
    const email = localStorage.getItem('userEmail');

    if (email) {
      const namePart = email.split('@')[0];          
      this.username = this.capitalize(namePart);     
    }
  }

  capitalize(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  goToAddTraining() {
    this.router.navigate(['/add-training']);
  }

  logout() {
    this.authService.logout();
  }
}

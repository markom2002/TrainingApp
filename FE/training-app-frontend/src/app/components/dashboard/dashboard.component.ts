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

  constructor(private router: Router) {}

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
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    this.router.navigate(['/login']);
  }
}

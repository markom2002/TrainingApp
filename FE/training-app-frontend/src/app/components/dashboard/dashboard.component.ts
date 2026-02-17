import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TrainingListComponent } from '../../components/training-list.component';   
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
export class DashboardComponent {

  constructor(private router: Router) {}

  goToAddTraining() {
    this.router.navigate(['/add-training']);
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}

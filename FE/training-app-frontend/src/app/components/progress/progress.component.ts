import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TrainingService } from '../../services/training.service';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.css']
})
export class ProgressComponent {

  year: number = new Date().getFullYear();
  month: number = new Date().getMonth() + 1;

  stats: any[] = [];

  constructor(private trainingService: TrainingService) {}

  loadStats() {
    this.trainingService.getMonthlyStats(this.year, this.month)
      .subscribe({
        next: res => this.stats = res,
        error: err => alert('Failed to load stats: ' + (err.error?.message || err.message))
      });
  }
}

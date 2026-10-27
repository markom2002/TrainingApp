import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { TrainingService } from '../../services/training.service';
import { MonthlyTrainingStats } from '../../models/training.model';
import { apiErrorMessage } from '../../services/api-error';

@Component({
  selector: 'app-progress', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './progress.component.html', styleUrls: ['./progress.component.css']
})
export class ProgressComponent implements OnInit, OnDestroy {
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;
  loadedYear = this.year;
  loadedMonth = this.month;
  stats: MonthlyTrainingStats[] = [];
  loading = false;
  errorMessage = '';
  private request?: Subscription;
  constructor(private trainingService: TrainingService) {}
  ngOnInit() { this.loadStats(); }
  ngOnDestroy() { this.request?.unsubscribe(); }
  loadStats(form?: NgForm) {
    if (form?.invalid) return;
    this.request?.unsubscribe();
    this.loading = true;
    this.errorMessage = '';
    this.stats = [];
    const year = this.year, month = this.month;
    this.request = this.trainingService.getMonthlyStats(year, month).pipe(finalize(() => this.loading = false)).subscribe({
      next: result => { this.stats = result; this.loadedYear = year; this.loadedMonth = month; },
      error: error => this.errorMessage = apiErrorMessage(error)
    });
  }
}

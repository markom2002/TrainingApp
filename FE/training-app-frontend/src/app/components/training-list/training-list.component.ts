import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TrainingService } from '../../services/training.service';
import { Training, ExerciseType } from '../../models/training.model';

@Component({
  selector: 'app-training-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './training-list.component.html',
  styleUrls: ['./training-list.component.css']
})
export class TrainingListComponent implements OnInit {

  trainings: Training[] = [];
  ExerciseType = ExerciseType;

  constructor(
    private trainingService: TrainingService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadTrainings();
  }

  loadTrainings() {
    this.trainingService.getAll().subscribe({
      next: data => this.trainings = data,
      error: err => console.error(err)
    });
  }

  deleteTraining(id: number) {
    if (confirm('Are you sure you want to delete this training?')) {
      this.trainingService.delete(id).subscribe({
        next: () => this.loadTrainings(),
        error: err => console.error(err)
      });
    }
  }

  editTraining(id: number) {
  this.router.navigate(['/edit-training', id]);
}

}

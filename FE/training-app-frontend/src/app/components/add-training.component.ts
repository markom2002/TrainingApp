import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TrainingService } from '../services/training.service';
import { Training, ExerciseType } from '../models/training.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-training',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-training.component.html',
  styleUrls: ['./add-training.component.css']
})
export class AddTrainingComponent implements OnInit {

  exerciseTypes = ExerciseType;
  isEditMode = false;
  trainingId!: number;
  serverErrors: any = {};

  training: Training = {
    exerciseType: ExerciseType.Cardio,
    durationMinutes: 30,
    calories: 200,
    intensity: 5,
    fatigue: 5,
    trainingDate: new Date()
  };

  constructor(
    private trainingService: TrainingService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEditMode = true;
      this.trainingId = +id;

      this.trainingService.getById(this.trainingId).subscribe({
        next: data => this.training = data,
        error: err => console.error(err)
      });
    }
  }

  submit() {

    this.serverErrors = {};

    const request = this.isEditMode
      ? this.trainingService.update(this.trainingId, this.training)
      : this.trainingService.add(this.training);

    request.subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        if (err.status === 400 && err.error?.errors) {
          this.serverErrors = err.error.errors;
        } else {
          alert('Something went wrong.');
        }
      }
    });
  }
}

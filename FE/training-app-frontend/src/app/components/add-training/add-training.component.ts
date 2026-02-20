import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TrainingService } from '../../services/training.service';
import { ExerciseType, Training } from '../../models/training.model';

@Component({
  selector: 'app-add-training',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-training.component.html',
  styleUrls: ['./add-training.component.css']
})
export class AddTrainingComponent {

  exerciseTypes = ExerciseType;
  serverErrors: any = {};

  formModel = {
    exerciseType: ExerciseType.Cardio,
    durationMinutes: 30,
    calories: 200,
    intensity: 5,
    fatigue: 5,
    trainingDate: this.getNow(),
    notes: ''
  };

  constructor(
    private trainingService: TrainingService,
    private router: Router
  ) {}

  submit() {
    this.serverErrors = {};

    const trainingToSend: Training = {
      ...this.formModel,
      trainingDate: new Date(this.formModel.trainingDate)
    };

    this.trainingService.add(trainingToSend).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: err => {
        if (err.status === 400 && err.error?.errors) {
          this.serverErrors = err.error.errors;
        } else {
          alert('Something went wrong.');
        }
      }
    });
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }

  private getNow(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0,16);
  }
}

import { apiErrorMessage } from '../../services/api-error';
import { finalize } from 'rxjs';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
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
  errorMessage = '';
  submitting = false;

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

  submit(form: NgForm) {
    if (form.invalid || this.submitting) { form.control.markAllAsTouched(); return; }
    this.errorMessage = '';
    this.submitting = true;

    const trainingToSend: Training = {
      ...this.formModel,
      trainingDate: new Date(this.formModel.trainingDate)
    };

    this.trainingService.add(trainingToSend).pipe(finalize(() => this.submitting = false)).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: error => this.errorMessage = apiErrorMessage(error)
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

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TrainingService } from '../../services/training.service';
import { ExerciseType, Training } from '../../models/training.model';

@Component({
  selector: 'app-edit-training',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-training.component.html',
  styleUrls: ['./edit-training.component.css']
})
export class EditTrainingComponent implements OnInit {

  exerciseTypes = ExerciseType;
  trainingId!: number;

  formModel: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trainingService: TrainingService
  ) {}

  ngOnInit() {
    this.trainingId = Number(this.route.snapshot.paramMap.get('id'));

    this.trainingService.getById(this.trainingId).subscribe(data => {
      const convertedExerciseType =
        typeof data.exerciseType === 'string'
          ? ExerciseType[data.exerciseType as keyof typeof ExerciseType]
          : data.exerciseType;

      this.formModel = {
        ...data,
        exerciseType: convertedExerciseType,
        trainingDate: this.formatDate(data.trainingDate)
      };
    });
  }

  submit() {
    const trainingToSend: Training = {
      ...this.formModel,
      trainingDate: new Date(this.formModel.trainingDate)
    };

    this.trainingService.update(this.trainingId, trainingToSend)
      .subscribe(() => this.router.navigate(['/dashboard']));
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }

  private formatDate(date: string | Date): string {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); 
    return d.toISOString().slice(0, 16);
  }
}

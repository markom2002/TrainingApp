import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { AddTrainingComponent } from './components/add-training.component';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { TrainingListComponent } from './components/training-list.component';
import { ProgressComponent } from './components/progress/progress.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    importProvidersFrom(FormsModule), 
    AuthService,
    AuthGuard,
    provideRouter([
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'add-training', component: AddTrainingComponent, canActivate: [AuthGuard] },
      { path: 'trainings', component: TrainingListComponent, canActivate: [AuthGuard] },
      { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
      { path: 'progress', component: ProgressComponent, canActivate: [AuthGuard] },
      { path: 'edit-training/:id', component: AddTrainingComponent, canActivate: [AuthGuard] }
    ])
  ]
};

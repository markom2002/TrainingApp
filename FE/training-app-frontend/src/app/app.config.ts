import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';
import { AuthGuard } from './auth.guard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter([
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () =>
          import('./components/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./components/register/register.component').then(
            (m) => m.RegisterComponent,
          ),
      },
      {
        path: 'dashboard',
        canActivate: [AuthGuard],
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'profile',
        canActivate: [AuthGuard],
        loadComponent: () =>
          import('./components/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      {
        path: 'trainings',
        canActivate: [AuthGuard],
        loadComponent: () =>
          import('./components/training-list/training-list.component').then(
            (m) => m.TrainingListComponent,
          ),
      },
      {
        path: 'progress',
        canActivate: [AuthGuard],
        loadComponent: () =>
          import('./components/progress/progress.component').then(
            (m) => m.ProgressComponent,
          ),
      },
      {
        path: 'add-training',
        canActivate: [AuthGuard],
        loadComponent: () =>
          import('./components/workout-editor/workout-editor.component').then(
            (m) => m.WorkoutEditorComponent,
          ),
      },
      {
        path: 'edit-training/:id',
        canActivate: [AuthGuard],
        loadComponent: () =>
          import('./components/workout-editor/workout-editor.component').then(
            (m) => m.WorkoutEditorComponent,
          ),
      },
    ]),
  ],
};

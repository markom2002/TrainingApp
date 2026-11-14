import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';
import { AuthGuard } from './auth.guard';
import { guestGuard } from './guest.guard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(
      [
        { path: '', redirectTo: 'login', pathMatch: 'full' },
        {
          path: 'login',
          canActivate: [guestGuard],
          loadComponent: () =>
            import('./components/login/login.component').then(
              (m) => m.LoginComponent,
            ),
        },
        {
          path: 'register',
          canActivate: [guestGuard],
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
          path: 'journey',
          canActivate: [AuthGuard],
          loadComponent: () =>
            import('./components/journey/journey-page.component').then(
              (m) => m.JourneyPageComponent,
            ),
        },
        {
          path: 'trainings',
          canActivate: [AuthGuard],
          loadComponent: () =>
              import('./components/training-list/training-calendar.component').then(
                (m) => m.TrainingCalendarComponent,
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
      ],
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
  ],
};

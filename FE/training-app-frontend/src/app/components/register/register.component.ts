import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { apiErrorMessage } from '../../services/api-error';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: [
    '../../auth-scene.css',
    '../../auth-page.css',
    '../../auth-impact.css',
  ],
})
export class RegisterComponent {
  email = '';
  password = '';
  showPassword = false;
  confirmPassword = '';
  gender = '';
  errorMessage = '';
  submitting = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onRegister(form: NgForm) {
    this.errorMessage = '';
    if (form.invalid || this.submitting) {
      form.control.markAllAsTouched();
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }
    if (new TextEncoder().encode(this.password).length > 72) {
      this.errorMessage = 'Password must not exceed 72 UTF-8 bytes.';
      return;
    }
    this.submitting = true;
    this.authService
      .register(this.email.trim(), this.password, this.gender)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () =>
          this.router.navigate(['/login'], {
            queryParams: { registered: 'true' },
          }),
        error: (error) => (this.errorMessage = apiErrorMessage(error)),
      });
  }
}

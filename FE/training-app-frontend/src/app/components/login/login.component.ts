import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { apiErrorMessage } from '../../services/api-error';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: [
    '../../auth-scene.css',
    '../../auth-page.css',
    '../../auth-impact.css',
  ],
})
export class LoginComponent {
  username = '';
  password = '';
  showPassword = false;
  errorMessage = '';
  submitting = false;
  registered: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    route: ActivatedRoute,
  ) {
    this.registered = route.snapshot.queryParamMap.get('registered') === 'true';
  }

  onLogin(form: NgForm) {
    this.errorMessage = '';
    if (form.invalid || this.submitting) {
      form.control.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.authService
      .login(this.username.trim(), this.password)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          localStorage.setItem('userEmail', this.username.trim());
          this.router.navigate(['/dashboard']);
        },
        error: (error) => (this.errorMessage = apiErrorMessage(error)),
      });
  }
}

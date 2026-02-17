import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  email = '';
  password = '';
  confirmPassword = '';
  gender = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  onRegister() {

    if (this.password !== this.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (!this.gender) {
      alert("Please select gender");
      return;
    }

    this.authService.register(this.email, this.password, this.gender)
      .subscribe({
        next: () => {
          alert("Registration successful!");
          // automatski login
          this.authService.login(this.email, this.password);
        },
        error: err => alert("Registration failed: " + (err.error?.message || err.message))
      });
  }
}

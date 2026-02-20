import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  username = '';
  password = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin() {
    this.authService.login(this.username, this.password).subscribe({
      next: res => {
        this.authService.saveToken(res.token);
        localStorage.setItem('userEmail', this.username); 
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        alert('Login failed: ' + (err.error?.message || err.message));
      }
    });
  }
}

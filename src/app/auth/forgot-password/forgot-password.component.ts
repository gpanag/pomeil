import { Component } from '@angular/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  email = '';
  error = '';
  loading = false;
  sent = false;

  constructor(private auth: AuthService) {}

  submit(): void {
    if (!this.email) return;
    this.loading = true;
    this.error = '';
    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.sent = true;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }
}

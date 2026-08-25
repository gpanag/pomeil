import { Component } from '@angular/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  hideCurrentPassword = true;
  hideNewPassword = true;
  error = '';
  success = '';
  loading = false;

  constructor(private auth: AuthService) {}

  get passwordsMatch(): boolean {
    return this.newPassword === this.confirmPassword;
  }

  get formValid(): boolean {
    return !!this.currentPassword && !!this.newPassword && !!this.confirmPassword
      && this.passwordsMatch && this.newPassword.length >= 6;
  }

  submit(): void {
    if (!this.formValid) return;
    this.loading = true;
    this.error = '';
    this.success = '';
    this.auth.changePassword(this.currentPassword, this.newPassword, this.confirmPassword).subscribe({
      next: () => {
        this.success = 'AUTH.PASSWORD_CHANGED';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }
}

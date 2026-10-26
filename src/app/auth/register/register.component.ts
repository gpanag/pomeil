import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrl: './register.component.scss',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class RegisterComponent {
  email = '';
  name = '';
  password = '';
  confirmPassword = '';
  hidePassword = true;
  error = '';
  loading = false;
  submittedEmail = '';

  constructor(private auth: AuthService, private router: Router) {
    if (auth.isLoggedIn()) {
      router.navigate(['/']);
    }
  }

  get passwordsMatch(): boolean {
    return this.password === this.confirmPassword;
  }

  get formValid(): boolean {
    return !!this.email && this.password.length >= 6 && this.passwordsMatch;
  }

  register(): void {
    if (!this.formValid) return;
    this.loading = true;
    this.error = '';
    this.auth.register(this.email, this.password, this.name).subscribe({
      next: (res) => {
        if (res.jwt) {
          // Email confirmation is disabled server-side — straight to home.
          this.router.navigateByUrl('/');
        } else {
          // Confirmation pending: show check-email view.
          this.submittedEmail = this.email;
          this.loading = false;
        }
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }
}

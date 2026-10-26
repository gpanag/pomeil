import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrl: './reset-password.component.scss',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ResetPasswordComponent implements OnInit {
  code = '';
  password = '';
  confirmPassword = '';
  hidePassword = true;
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.code = this.route.snapshot.queryParamMap.get('code') || '';
  }

  get passwordsMatch(): boolean {
    return this.password === this.confirmPassword;
  }

  get formValid(): boolean {
    return !!this.code && this.password.length >= 6 && this.passwordsMatch;
  }

  submit(): void {
    if (!this.formValid) return;
    this.loading = true;
    this.error = '';
    this.auth.resetPassword(this.code, this.password, this.confirmPassword).subscribe({
      next: () => {
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }
}

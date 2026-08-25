import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  identifier = '';
  password = '';
  error = '';
  loading = false;
  hidePassword = true;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    if (auth.isLoggedIn()) {
      router.navigate(['/']);
    }
  }

  login(): void {
    if (!this.identifier || !this.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.identifier, this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }
}

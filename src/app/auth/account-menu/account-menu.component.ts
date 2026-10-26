import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
    selector: 'app-account-menu',
    templateUrl: './account-menu.component.html',
    styleUrl: './account-menu.component.scss',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class AccountMenuComponent {
  constructor(public auth: AuthService, private router: Router) {}

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}

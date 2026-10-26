import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../auth.service';
import { StrapiUser } from '../auth.interfaces';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.scss',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ProfileComponent implements OnInit {
  username = '';
  email = '';
  error = '';
  success = '';
  loading = false;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    if (user) {
      this.username = user.username || '';
      this.email = user.email || '';
    }
  }

  save(): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    this.auth.updateProfile({ username: this.username }).subscribe({
      next: () => {
        this.success = 'AUTH.PROFILE_UPDATED';
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }
}

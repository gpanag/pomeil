import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '../translate/translate.pipe';

@Component({
  standalone: true,
  selector: 'app-login-warning-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, RouterModule, TranslatePipe],
  template: `
    <div class="warning-dialog">
      <h2 mat-dialog-title>
        <mat-icon class="warn-icon" color="warn">warning</mat-icon>
        {{ "AUTH.NOT_LOGGED_IN_TITLE" | translate }}
      </h2>
      <mat-dialog-content>
        <p>{{ "AUTH.NOT_LOGGED_IN_BODY" | translate }}</p>
        <ul>
          <li>{{ "AUTH.NOT_LOGGED_IN_BULLET_PROGRESS" | translate }}</li>
          <li>{{ "AUTH.NOT_LOGGED_IN_BULLET_SCORES" | translate }}</li>
        </ul>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="continueAnyway()">
          <mat-icon>play_arrow</mat-icon>
          {{ "AUTH.CONTINUE_ANYWAY" | translate }}
        </button>
        <a mat-stroked-button color="primary" routerLink="/register" (click)="dismiss()">
          <mat-icon>person_add</mat-icon>
          {{ "AUTH.REGISTER" | translate }}
        </a>
        <a mat-raised-button color="primary" routerLink="/login" [queryParams]="{ returnUrl: returnUrl }" (click)="dismiss()">
          <mat-icon>login</mat-icon>
          {{ "AUTH.LOGIN" | translate }}
        </a>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .warning-dialog { min-width: 320px; max-width: 520px; }
    h2 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.5rem; }
    .warn-icon { color: #ef6c00; }
    ul { margin: 0.5rem 0; padding-left: 1.4rem; color: rgba(0,0,0,0.75); }
    li { margin-bottom: 0.3rem; line-height: 1.4; }
    mat-dialog-actions { gap: 0.5rem; flex-wrap: wrap; }
    @media (max-width: 600px) {
      mat-dialog-actions { justify-content: stretch; }
      mat-dialog-actions > * { flex: 1; min-width: 130px; }
    }
  `]
})
export class LoginWarningDialogComponent {
  returnUrl: string;
  constructor(private ref: MatDialogRef<LoginWarningDialogComponent>, router: Router) {
    this.returnUrl = router.url;
  }
  continueAnyway(): void { this.ref.close('continue'); }
  dismiss(): void { this.ref.close('navigate-away'); }
}

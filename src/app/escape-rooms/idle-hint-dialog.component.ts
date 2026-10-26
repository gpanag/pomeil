import { Component, ChangeDetectionStrategy } from '@angular/core';

import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../translate/translate.pipe';

/**
 * One-time nudge shown by EscapeRoomBaseComponent when the player has made no
 * progress for a while (ESCAPE_ROOM_TIMING.idleHintPopupDelay, ~30s), pointing
 * them at the hint button. Non-linear / no-character rooms still get it because
 * it lives in the shared base. Dismissed with a single "Got it".
 */
@Component({
    selector: 'app-idle-hint-dialog',
    imports: [MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
    template: `
    <div class="idle-hint-dialog">
      <h2 mat-dialog-title>
        <mat-icon class="hint-icon">lightbulb</mat-icon>
        {{ "HINT_POPUP.TITLE" | translate }}
      </h2>
      <mat-dialog-content>
        <p>{{ "HINT_POPUP.BODY" | translate }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-raised-button color="primary" (click)="close()">
          <mat-icon>check</mat-icon>
          {{ "HINT_POPUP.GOT_IT" | translate }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    .idle-hint-dialog { min-width: 300px; max-width: 460px; }
    h2 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.5rem; }
    .hint-icon { color: #f6b40a; }
    p { line-height: 1.5; color: rgba(0,0,0,0.75); margin: 0.25rem 0; }
  `]
})
export class IdleHintDialogComponent {
  constructor(private ref: MatDialogRef<IdleHintDialogComponent>) {}
  close(): void { this.ref.close(); }
}

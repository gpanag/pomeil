import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../translate/translate.pipe';

export interface LearningGuideDialogData {
  /** 'all' = journey steps + how to play; 'room' = how-to-play only (opened from inside a room). */
  section?: 'all' | 'room';
}

/**
 * On-demand guide ("a tour / guide button", partner feedback 2026-08-31).
 * Reuses the already-translated LEARNING_PAGE.INTRO.STEP_* copy for the
 * journey and adds a short "how to play an escape room" list (GUIDE.*).
 * Opened from the learning sidenav and from the in-room help button.
 */
@Component({
    selector: 'app-learning-guide-dialog',
    imports: [MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
    template: `
    <div class="guide-dialog">
      <h2 mat-dialog-title>
        <mat-icon class="title-icon">help_outline</mat-icon>
        {{ "GUIDE.TITLE" | translate }}
      </h2>
      <mat-dialog-content>
        @if (showJourney) {
          <h3>{{ "GUIDE.PLATFORM_TITLE" | translate }}</h3>
          <ol class="journey">
            @for (s of journeySteps; track s) {
              <li>
                <strong>{{ s.title | translate }}</strong>
                <span>{{ s.desc | translate }}</span>
              </li>
            }
          </ol>
        }
    
        <h3>{{ "GUIDE.ROOM_TITLE" | translate }}</h3>
        <ol class="room">
          @for (k of roomSteps; track k) {
            <li>{{ k | translate }}</li>
          }
        </ol>
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
    .guide-dialog { min-width: 300px; }
    h2 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.25rem; }
    .title-icon { color: var(--sys-primary); }
    h3 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.5rem; color: var(--sys-on-surface); }
    ol { margin: 0; padding-left: 1.4rem; }
    li { margin: 0.35rem 0; line-height: 1.5; color: var(--sys-on-surface-variant); }
    .journey li { display: list-item; }
    .journey strong { display: block; color: var(--sys-on-surface); }
    mat-dialog-content { max-height: 70vh; }
  `]
})
export class LearningGuideDialogComponent {
  readonly journeySteps = [
    { title: 'LEARNING_PAGE.INTRO.STEP_SELECT', desc: 'LEARNING_PAGE.INTRO.STEP_SELECT_DESC' },
    { title: 'LEARNING_PAGE.INTRO.STEP_PLAY', desc: 'LEARNING_PAGE.INTRO.STEP_PLAY_DESC' },
    { title: 'LEARNING_PAGE.INTRO.STEP_REVIEW', desc: 'LEARNING_PAGE.INTRO.STEP_REVIEW_DESC' },
    { title: 'LEARNING_PAGE.INTRO.STEP_DOWNLOAD', desc: 'LEARNING_PAGE.INTRO.STEP_DOWNLOAD_DESC' },
    { title: 'LEARNING_PAGE.INTRO.STEP_ASSESS', desc: 'LEARNING_PAGE.INTRO.STEP_ASSESS_DESC' },
  ];
  readonly roomSteps = [1, 2, 3, 4, 5, 6, 7].map(i => `GUIDE.ROOM_STEP_${i}`);
  readonly showJourney: boolean;

  constructor(
    private ref: MatDialogRef<LearningGuideDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: LearningGuideDialogData | null,
  ) {
    this.showJourney = (data?.section ?? 'all') === 'all';
  }

  close(): void { this.ref.close(); }
}

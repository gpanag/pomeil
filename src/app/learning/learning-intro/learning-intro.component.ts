import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { EscapeRoomTextService } from '../../shared/escape-room/escape-room-text.service';
import { LearningFlowService } from '../learning-flow.service';
import { AuthService } from '../../auth/auth.service';
import { LoginWarningDialogComponent } from '../../escape-rooms/login-warning-dialog.component';

@Component({
  selector: 'app-learning-intro',
  templateUrl: './learning-intro.component.html',
  styleUrls: ['./learning-intro.component.scss'],
})
export class LearningIntroComponent implements OnInit {
  playerName: string = '';

  constructor(
    private textService: EscapeRoomTextService,
    private learningService: LearningFlowService,
    private auth: AuthService,
    private dialog: MatDialog,
    private router: Router,
  ) {}

  /**
   * Begins the learning flow. Anonymous first-time visitors get the same
   * "your progress won't be saved" prompt shown when entering an escape
   * room (with Register / Log in / Continue Anyway options); logged-in
   * users — or anyone who already acknowledged it this session — go straight
   * through. The session flag is shared with the room-level warning so the
   * user is never prompted twice.
   */
  startLearning(): void {
    if (!this.isPlayerNameValid) return;

    const alreadyAcknowledged = sessionStorage.getItem('pomeil_login_warning_dismissed') === 'true';
    if (this.auth.isLoggedIn() || alreadyAcknowledged) {
      this.router.navigate(['/learning/flow']);
      return;
    }

    const ref = this.dialog.open(LoginWarningDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      disableClose: false,
    });
    ref.afterClosed().subscribe(result => {
      if (result === 'continue') {
        sessionStorage.setItem('pomeil_login_warning_dismissed', 'true');
        this.router.navigate(['/learning/flow']);
      }
      // 'navigate-away' → the dialog's Register / Login routerLinks navigate away.
    });
  }

  ngOnInit(): void {
    this.playerName = this.textService.getPlayerName();
  }

  savePlayerName(): void {
    this.textService.setPlayerName(this.playerName.trim());
  }

  /** Player name is required before the user can start learning. */
  get isPlayerNameValid(): boolean {
    return !!this.playerName && this.playerName.trim().length > 0;
  }

  // --- Progress-based gating ---

  get hasPlayedAnyRoom(): boolean {
    return Object.keys(this.learningService.getAllRoomScores()).length > 0;
  }

  get hasSelectedAnySkill(): boolean {
    return (this.learningService.getSelectedSkills() || []).length > 0;
  }

  get hasCompletedAllSelected(): boolean {
    const selected = this.learningService.getSelectedSkills() || [];
    if (selected.length === 0) return false;
    const scores = this.learningService.getAllRoomScores();
    return selected.every(id => !!scores[id]);
  }
}

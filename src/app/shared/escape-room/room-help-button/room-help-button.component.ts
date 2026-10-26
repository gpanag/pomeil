import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LearningGuideDialogComponent } from '../../../learning/learning-guide-dialog/learning-guide-dialog.component';
import { TranslatePipe } from '../../../translate/translate.pipe';

/** Remembered across rooms and sessions; absent means "never played before". */
const SPOTS_KEY = 'pomeil_show_hotspots';
/** Global class the shared room stylesheet keys the outlines off. */
const SPOTS_CLASS = 'pomeil-show-hotspots';
/** Space the rotate notice takes at the bottom of the screen; the intro overlay pads by it. */
const ROTATE_SPACE_VAR = '--rotate-hint-space';

/**
 * "How to play" button for the in-room chrome (partner feedback 2026-08-31:
 * "a tour (guide button)"). Opens the shared guide dialog in its room-only
 * mode. Placed next to the hint button in every room template; it is a
 * self-contained standalone component so rooms need no extra wiring.
 */
@Component({
    selector: 'app-room-help-button',
    imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe],
    template: `
    @if (!hidden) {
      <button mat-mini-fab class="room-help-button" type="button"
        [matTooltip]="'GUIDE.ROOM_TITLE' | translate"
        [attr.aria-label]="'GUIDE.ROOM_TITLE' | translate"
        (click)="open($event)">
        <mat-icon>help_outline</mat-icon>
      </button>
    }
    <!-- "Show me what I can click" (consultations report 2026-09-21, GR + EE:
    first-time users could not tell which objects were interactive and asked
    for visual indicators). Deliberately NOT an ambient effect: an always-on
    pulse was tried in 2026-05-11 and removed because players read it as the
    hint system firing by itself. This is explicit, static (no animation) and
    a different colour from the yellow hint pulse. -->
    @if (!hidden) {
      <button mat-mini-fab class="room-spots-button" type="button"
        [class.is-on]="spotsOn"
        [matTooltip]="(spotsOn ? 'ESCAPE_ROOM.HIDE_SPOTS' : 'ESCAPE_ROOM.SHOW_SPOTS') | translate"
        [attr.aria-label]="(spotsOn ? 'ESCAPE_ROOM.HIDE_SPOTS' : 'ESCAPE_ROOM.SHOW_SPOTS') | translate"
        [attr.aria-pressed]="spotsOn"
        (click)="toggleSpots($event)">
        <mat-icon>{{ spotsOn ? 'visibility' : 'visibility_off' }}</mat-icon>
      </button>
    }
    <!-- Portrait phones: the 1680×1024 scene shrinks to a strip. Shown by CSS only
    (orientation + width media query); dismissible; localized. -->
    @if (!rotateDismissed) {
      <div #rotateHint class="rotate-hint" role="status">
        <mat-icon>screen_rotation</mat-icon>
        <span>{{ 'GUIDE.ROTATE_HINT' | translate }}</span>
        <button mat-icon-button type="button" (click)="rotateDismissed = true" [attr.aria-label]="'HINT_POPUP.GOT_IT' | translate">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    :host { display: contents; }
    .room-help-button {
      position: absolute;
      top: 24px;             /* vertically centred on the 56px fullscreen button (top:16) */
      right: 80px;           /* left of the fullscreen button (right:16) */
      z-index: 200;
      width: 40px; height: 40px;
      background: rgba(0, 0, 0, 0.45);
      color: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      mat-icon { font-size: 22px; width: 22px; height: 22px; }
      &:hover { background: rgba(0, 0, 0, 0.65); }
    }
    .room-spots-button {
      position: absolute;
      top: 24px;
      right: 136px;          /* left of the help button (right:80) */
      z-index: 200;
      width: 40px; height: 40px;
      background: rgba(0, 0, 0, 0.45);
      color: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      mat-icon { font-size: 22px; width: 22px; height: 22px; }
      &:hover { background: rgba(0, 0, 0, 0.65); }
      &.is-on {
        background: rgba(0, 150, 170, 0.85);
        color: #fff;
      }
    }
    @media (max-width: 720px) {
      /* The fullscreen button keeps its 56px size here (right:16 → 72px), so
         start clear of it — at right:66 the two overlapped by 6px. */
      .room-help-button { top: 10px; right: 78px; width: 36px; height: 36px; }
      .room-spots-button { top: 10px; right: 120px; width: 36px; height: 36px; }
    }
    .rotate-hint { display: none; }
    @media (orientation: portrait) and (max-width: 600px) {
      .rotate-hint {
        display: flex;
        position: fixed;
        left: 12px; right: 12px; bottom: 16px;
        z-index: 300;
        align-items: center;
        gap: 8px;
        padding: 10px 6px 10px 12px;
        border-radius: 12px;
        background: var(--sys-primary-container, #e0f2f4);
        color: var(--sys-on-primary-container, #00363d);
        font-size: 0.9rem;
        line-height: 1.35;
        box-shadow: 0 4px 16px rgba(0,0,0,0.35);
        span { flex: 1 1 auto; }
        > mat-icon:first-child { flex: 0 0 auto; }
      }
    }
  `]
})
export class RoomHelpButtonComponent implements OnInit, OnDestroy {
  /** Rooms pass their own "chrome hidden" condition (intro popup up, etc.). */
  @Input() hidden = false;
  rotateDismissed = false;
  spotsOn = false;
  private rotateHintEl: HTMLElement | null = null;
  private rotateObserver: ResizeObserver | null = null;

  constructor(private dialog: MatDialog) {}

  /** The notice is fixed over the bottom of the screen, where the intro card's
   *  start button ends up on a portrait phone — publish how much room it takes
   *  so the intro overlay can keep clear of it (Lessons Learned report,
   *  2026-09-24: rooms that could not be entered on phones). */
  @ViewChild('rotateHint') set rotateHint(ref: ElementRef<HTMLElement> | undefined) {
    this.rotateObserver?.disconnect();
    this.rotateHintEl = ref?.nativeElement ?? null;
    if (this.rotateHintEl && typeof ResizeObserver !== 'undefined') {
      this.rotateObserver = new ResizeObserver(this.measureRotateHint);
      this.rotateObserver.observe(this.rotateHintEl);
    }
    this.measureRotateHint();
  }

  private measureRotateHint = (): void => {
    const root = document.documentElement.style;
    const el = this.rotateHintEl;
    if (!el || getComputedStyle(el).display === 'none') {
      root.removeProperty(ROTATE_SPACE_VAR);
      return;
    }
    const space = Math.ceil(window.innerHeight - el.getBoundingClientRect().top + 8);
    root.setProperty(ROTATE_SPACE_VAR, `${Math.max(0, space)}px`);
  };

  ngOnInit(): void {
    // On by default the first time someone plays — that is the case the
    // consultations report describes ("not always intuitive, especially for
    // first-time users"). After that the player's own choice is remembered.
    let stored: string | null = null;
    try { stored = localStorage.getItem(SPOTS_KEY); } catch { /* private mode */ }
    this.spotsOn = stored === null ? true : stored === '1';
    this.applySpots();
    // Rotating the phone shows/hides the notice via a media query.
    window.addEventListener('resize', this.measureRotateHint);
  }

  ngOnDestroy(): void {
    // The class lives on <body>, so it must not leak out of the room.
    document.body.classList.remove(SPOTS_CLASS);
    window.removeEventListener('resize', this.measureRotateHint);
    this.rotateObserver?.disconnect();
    document.documentElement.style.removeProperty(ROTATE_SPACE_VAR);
  }

  toggleSpots(ev: Event): void {
    ev.stopPropagation();
    this.spotsOn = !this.spotsOn;
    try { localStorage.setItem(SPOTS_KEY, this.spotsOn ? '1' : '0'); } catch { /* private mode */ }
    this.applySpots();
  }

  private applySpots(): void {
    document.body.classList.toggle(SPOTS_CLASS, this.spotsOn);
  }

  open(ev: Event): void {
    ev.stopPropagation();
    this.dialog.open(LearningGuideDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      data: { section: 'room' },
    });
  }
}

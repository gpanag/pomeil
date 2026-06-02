import { Directive, ElementRef, Inject, OnInit, OnDestroy, NgZone, ChangeDetectorRef, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ConfirmExitDialogComponent } from '../../escape-rooms/confirm-exit-dialog.component';
import { LoginWarningDialogComponent } from '../../escape-rooms/login-warning-dialog.component';
import { IdleHintDialogComponent } from '../../escape-rooms/idle-hint-dialog.component';
import { EscapeRoomTextService, EscapeRoomTexts } from './escape-room-text.service';
import { Dialogue, HotspotRect, EscapeRoomConfig, CharacterImageMap, ESCAPE_ROOM_TIMING } from './escape-room.interfaces';
import { PuzzleScore, RoomScore, calculatePuzzleScore, calculateOverallRoomScore } from './escape-room-scoring.interfaces';
import { LearningFlowService } from '../../learning/learning-flow.service';
import { AuthService } from '../../auth/auth.service';
import { TranslateService } from '../../translate/translate.service';

@Directive()
export abstract class EscapeRoomBaseComponent implements OnInit, OnDestroy {

  // --- Zone / change detection (avoids excessive CD from high-frequency intervals) ---
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private hostEl = inject(ElementRef);

  // --- Learning mode / scoring ---
  private activatedRoute = inject(ActivatedRoute);
  private learningFlowService = inject(LearningFlowService);
  private authService = inject(AuthService);
  isLearningMode = false;
  protected puzzleScores: PuzzleScore[] = [];
  learningOverallScore: number = 0;

  // --- Text / i18n ---
  private translateService = inject(TranslateService);
  protected texts: EscapeRoomTexts = {};
  private textSub: Subscription | null = null;
  private langSub: Subscription | null = null;

  // --- Common state (bound directly in templates) ---
  currentBackgroundUrl: string = '';
  zoomStyle: { [key: string]: string } = {
    'transform': 'scale(1)',
    'transform-origin': 'center center'
  };
  isDoorOpen: boolean = false;
  isPreloading: boolean = true;
  isFullscreen: boolean = false;
  isIntroPopupVisible: boolean = true;
  isGameCompleteOverlayVisible: boolean = false;

  // Dialogue system
  private _activeDialogue: Dialogue | null = null;
  get activeDialogue(): Dialogue | null { return this._activeDialogue; }
  set activeDialogue(value: Dialogue | null) {
    const wasOpen = !!this._activeDialogue;
    this._activeDialogue = value;
    // GLOBAL SAFETY NET for the "stuck character close-up" bug: many rooms set a
    // "*_talking" close-up as the SCENE BACKGROUND in onCharacterClick(), but their
    // dialogue-dismiss transitions don't always call updateBackground() when the
    // chat ends — leaving the close-up plastered over the exploration view
    // (reported in Financial/Amina, Cultural-Awareness, and present in others).
    // Whenever a dialogue chain ends (dialogue closed and nothing re-opened) and
    // we're idle in the main view, restore the state's correct background. Runs on
    // a microtask so the room's own dismiss logic (which may open the next line or
    // change state) finishes first.
    if (wasOpen && !value) {
      queueMicrotask(() => {
        if (!this._activeDialogue && this.isMainViewActive && !this.isQuizActive && !this.isAnimating) {
          try { this.updateBackground(); } catch { /* component torn down */ }
        }
      });
    }
  }
  displayedDialogueText: string = '';
  isTyping: boolean = false;
  protected dialogueInterval: any;

  // Animation lock — blocks all interactions during zoom-in/out
  isAnimating: boolean = false;

  // Hint system
  showHints: boolean = false;

  // Inline hint bubble — a small italic snippet of the current hint that appears
  // next to the hint button for a few seconds when the player requests a hint.
  hintBubbleText: string = '';
  isHintBubbleVisible: boolean = false;
  private hintBubbleTimer: any = null;
  /** When the idle bubble last popped, so it can re-pop every
   *  `hintBubbleRepeatInterval` while the player stays stuck. Reset on interaction. */
  private lastHintBubbleTs = 0;

  // Idle hint attention — escalates the hint button when the player is stuck.
  private lastInteractionTs = 0;
  private idleHintInterval: any = null;
  private idleHintShown = false;
  /** Whether the one-time "use the hint button" popup has already been shown
   *  for the current stuck period. Re-armed on the next deliberate interaction. */
  private idleHintPopupShown = false;
  /** Open ref to the idle-hint popup, so a deliberate interaction can dismiss it. */
  private idleHintDialogRef: MatDialogRef<IdleHintDialogComponent> | null = null;
  /** Records a deliberate interaction — a press/tap (pointerdown), touch or
   *  key — NOT mere pointer movement. Bound once so it can be detached on
   *  destroy; runs outside Angular. Re-arms the idle hint popup AND closes it
   *  if it's open (the player is no longer idle, so the nudge must get out of the way). */
  private readonly onRoomActivity = (): void => {
    this.lastInteractionTs = Date.now();
    this.idleHintPopupShown = false;
    this.lastHintBubbleTs = 0;   // re-arm the bubble so the next stuck period pops at idleHintDelay
    const ref = this.idleHintDialogRef;
    this.idleHintDialogRef = null;
    // The player is no longer idle — get both idle nudges out of the way.
    if (ref || this.isHintBubbleVisible) {
      this.ngZone.run(() => {
        if (this.isHintBubbleVisible) { this.hideHintBubble(); }
        if (ref) { ref.close(); }
      });
    }
  };

  // Answer overlay (3-attempt reveal)
  showAnswerOverlay: boolean = false;
  answerOverlayText: string = '';
  answerOverlayCallback: (() => void) | null = null;

  // Puzzle feedback
  isPuzzleWrong: boolean = false;
  puzzleFeedback: string = '';

  // Skip puzzle
  showSkipConfirm: boolean = false;
  protected skipPuzzleCallback: (() => void) | null = null;

  // Audio tracking (for rooms that need it)
  protected activeAudioInstances: HTMLAudioElement[] = [];
  protected doorSound: HTMLAudioElement | null = null;
  protected stepSound: HTMLAudioElement | null = null;

  // --- Abstract contract ---
  abstract get config(): EscapeRoomConfig;
  abstract get isMainViewActive(): boolean;
  abstract get isQuizActive(): boolean;
  abstract updateBackground(): void;
  abstract onHotspotClick(target: string): void;
  abstract dismissDialogue(): void;

  // --- Character hover/leave (Phase 1) ---
  /** Override to provide character key → hover/hoverDoorOpen image map. */
  get characterImages(): CharacterImageMap { return {}; }

  /** Guard for character hover/leave interactions. Override for non-default guards. */
  protected canInteractWithCharacter(): boolean {
    return this.isMainViewActive && !this.activeDialogue && !this.isQuizActive && !this.isAnimating;
  }

  /** Which crossfade overlay layer (::before = 'a' / ::after = 'b') is
   *  currently holding the visible hover image. We alternate on each
   *  new hover so the new image lands on a NON-visible layer, then
   *  fade the old layer out and the new layer in simultaneously —
   *  which is what produces an actual A→B crossfade rather than an
   *  instant URL swap on the visible surface. See the .scene-background
   *  ::before/::after comment in the SCSS for the full rationale. */
  private activeHoverLayer: 'a' | 'b' = 'b';

  onCharacterHover(character: string): void {
    if (!this.canInteractWithCharacter()) return;
    const images = this.characterImages[character];
    if (!images) return;
    const url = this.isDoorOpen ? images.hoverDoorOpen : images.hover;
    // Always write the new image to the OTHER layer than the one
    // currently visible, then transition opacity on BOTH layers in
    // opposite directions. The new image is being painted onto a
    // (still-transparent) layer that's about to fade in — no visible
    // hard cut even if the user moves directly from one character
    // hotspot to another.
    const newLayer = this.activeHoverLayer === 'a' ? 'b' : 'a';
    const oldLayer = this.activeHoverLayer;
    const root = this.document.documentElement.style;
    root.setProperty(`--scene-hover-bg-${newLayer}`, `url("${url}")`);
    root.setProperty(`--scene-hover-opacity-${newLayer}`, '1');
    root.setProperty(`--scene-hover-opacity-${oldLayer}`, '0');
    this.activeHoverLayer = newLayer;
  }

  onCharacterLeave(): void {
    // Always fade out the hover overlay when the pointer leaves a character —
    // including mid-dialogue / mid-quiz / mid-animation. The previous
    // `canInteractWithCharacter()` guard skipped the fade-out once a dialogue
    // had opened, which left the character's close-up hover image plastered
    // over the scene after the player clicked a character and moved the mouse
    // down to the dialogue panel to dismiss it (the mouseleave fired while a
    // dialogue was active, so it was ignored). Reported in Financial:
    // "after talking to Amina, all hovers show a close view of Amina".
    // Clearing on leave is always safe, so there is no guard.
    this.clearCharacterHover();
  }

  /** Fade out BOTH character-hover crossfade layers. The image URLs on the
   *  ::before/::after layers are intentionally left in place so the layers
   *  animate their opacity to 0 instead of popping to empty mid-transition. */
  protected clearCharacterHover(): void {
    const root = this.document.documentElement.style;
    root.setProperty('--scene-hover-opacity-a', '0');
    root.setProperty('--scene-hover-opacity-b', '0');
  }

  // --- goBack / zoom-out (Phase 2) ---
  /** Override to clear room-specific zoom booleans. Called inside goBack(). */
  protected resetZoomState(): void {}

  goBack(): void {
    this.isAnimating = true;
    this.showHints = false;
    this.playSound('zoom-out.wav');
    this.resetZoom();
    setTimeout(() => {
      this.resetZoomState();
      this.updateBackground();
      this.isAnimating = false;
    }, ESCAPE_ROOM_TIMING.zoomOutDelay);
  }

  // --- Hint system (Phase 3) ---
  /** Override to return context-aware hint text based on current state. */
  protected getHintText(): string { return this.t('hints.default'); }

  /** Override for extra state when hint is requested (e.g. set isHintDialogue). */
  protected onHintRequested(): void {}

  requestHint(): void {
    this.resetIdleHint();
    this.playSound('hint-sound.wav');
    this.showHints = true;
    this.showHintPulse();
    this.onHintRequested();
    const hintText = this.getHintText();
    this.showDialogue({ character: '', text: hintText });
  }

  /** Shows a small italic snippet of the current hint next to the hint button
   *  for `hintBubbleDuration` ms, then fades it out. This is a stuck-player
   *  PROMINENCE nudge fired from the idle watcher (see tickIdleHint) — NOT on
   *  hint-button click. Clicking the button still opens the full hint exactly
   *  as before (showDialogue, above); this only makes the player aware help is
   *  there once they've made no progress for a while. */
  protected showHintBubble(text: string): void {
    if (!text) { return; }
    this.hintBubbleText = text;
    this.isHintBubbleVisible = true;
    if (this.hintBubbleTimer) { clearTimeout(this.hintBubbleTimer); }
    // Plain setTimeout (zone-patched when called inside ngZone) so the auto-hide
    // triggers change detection, matching showHintPulse() above.
    this.hintBubbleTimer = setTimeout(() => {
      this.isHintBubbleVisible = false;
    }, ESCAPE_ROOM_TIMING.hintBubbleDuration);
  }

  /** Immediately hides the inline hint bubble (the player is no longer idle). */
  protected hideHintBubble(): void {
    if (this.hintBubbleTimer) { clearTimeout(this.hintBubbleTimer); this.hintBubbleTimer = null; }
    this.isHintBubbleVisible = false;
  }

  // --- Puzzle helpers (Phase 4) ---
  protected fillGapSlot(answers: (string | null)[], word: string): void {
    const idx = answers.findIndex(w => !w);
    if (idx !== -1) { answers[idx] = word; }
  }

  protected resetGapSlots(count: number): (string | null)[] {
    this.puzzleFeedback = '';
    this.isPuzzleWrong = false;
    return new Array(count).fill(null);
  }

  protected selectMatchCue(cueId: string, solvedMatches: string[]): string | null {
    if (solvedMatches.includes(cueId)) return null;
    return cueId;
  }

  protected addToSequenceArray(sequence: string[], key: string, maxLength: number): string[] {
    if (sequence.length < maxLength && !sequence.includes(key)) {
      return [...sequence, key];
    }
    return sequence;
  }

  protected resetSequenceArray(): void {
    this.puzzleFeedback = '';
    this.isPuzzleWrong = false;
  }

  constructor(
    @Inject(DOCUMENT) protected document: Document,
    protected router: Router,
    protected dialog: MatDialog,
    protected textService: EscapeRoomTextService
  ) {}

  ngOnInit(): void {
    // Set per-room aspect ratio on host so .game-container inherits it
    const w = this.config.imageWidth || 1680;
    const h = this.config.imageHeight || 1024;
    (this.hostEl.nativeElement as HTMLElement).style.setProperty('--room-aspect-ratio', `${w} / ${h}`);

    this.document.addEventListener('fullscreenchange', this.onFullscreenChange);

    // Detect learning mode from query param
    this.isLearningMode = this.activatedRoute.snapshot.queryParamMap.get('mode') === 'learning';

    // Load texts for the active language, and re-load on every subsequent
    // language change so the room HUD / hint dialogues / inventory titles
    // pick up the new locale immediately. The currently visible
    // typewriter/dialogue text is intentionally NOT retranslated mid-flight
    // (it would require key tracking on every showDialogue() call site, of
    // which there are 800+); it stays in the previous language until
    // dismissed and the next dialogue uses the new one.
    this.reloadTexts();
    this.langSub = this.translateService.lang$.subscribe(() => this.reloadTexts());

    // Preload step sound so it plays instantly on zoom-in
    this.stepSound = new Audio('/assets/audio/step.wav');
    this.stepSound.load();

    // Preload door sound if configured
    if (this.config.preloadDoorSound) {
      this.doorSound = new Audio('/assets/audio/door-open.wav');
      this.doorSound.load();
    }

    // Warn anonymous users that progress won't be saved (once per session, opt-in via Continue)
    this.maybeShowLoginWarning();

    // Watch for inactivity so we can nudge a stuck player toward the hint button
    this.startIdleHintWatcher();

    this.onInit();
  }

  private maybeShowLoginWarning(): void {
    if (this.authService.isLoggedIn()) return;
    // Only show once per session — Continue Anyway sets the flag
    if (sessionStorage.getItem('pomeil_login_warning_dismissed') === 'true') return;
    setTimeout(() => {
      const ref = this.dialog.open(LoginWarningDialogComponent, {
        width: '520px',
        maxWidth: '95vw',
        disableClose: false,
      });
      ref.afterClosed().subscribe(result => {
        if (result === 'continue') {
          sessionStorage.setItem('pomeil_login_warning_dismissed', 'true');
        }
        // navigate-away or undefined: dialog already closed; if user used login/register
        // links those navigate via routerLink and unmount this component.
      });
    }, 200);
  }

  ngOnDestroy(): void {
    if (this.dialogueInterval) clearInterval(this.dialogueInterval);
    if (this.hintBubbleTimer) { clearTimeout(this.hintBubbleTimer); this.hintBubbleTimer = null; }
    // Tear down the idle-hint watcher (timer + passive listeners + host class)
    if (this.idleHintInterval) { clearInterval(this.idleHintInterval); this.idleHintInterval = null; }
    const idleHost = this.hostEl.nativeElement as HTMLElement;
    idleHost.removeEventListener('pointerdown', this.onRoomActivity);
    idleHost.removeEventListener('touchstart', this.onRoomActivity);
    idleHost.removeEventListener('keydown', this.onRoomActivity);
    idleHost.classList.remove('idle-hint-attention');
    this.document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    if (this.textSub) this.textSub.unsubscribe();
    if (this.langSub) this.langSub.unsubscribe();
    // Stop all playing audio immediately
    for (const audio of this.activeAudioInstances) {
      audio.pause();
    }
    this.activeAudioInstances = [];
    // Clear character-hover crossfade state for BOTH overlay layers
    // so nothing leaks into the next route (vars are set on
    // document.documentElement, not the component host).
    const root = this.document.documentElement.style;
    root.removeProperty('--scene-hover-bg-a');
    root.removeProperty('--scene-hover-bg-b');
    root.removeProperty('--scene-hover-opacity-a');
    root.removeProperty('--scene-hover-opacity-b');
    this.activeHoverLayer = 'b';
    this.onDestroy();
  }

  private reloadTexts(): void {
    if (!this.config?.roomId) return;
    if (this.textSub) this.textSub.unsubscribe();
    this.textSub = this.textService.loadTexts(this.config.roomId).subscribe(data => {
      this.texts = data;
      // Re-render templates that depend on this.texts via t(...) lookups.
      try { this.cdr.detectChanges(); } catch { /* host already torn down */ }
    });
  }

  /** Override in subclass for additional init logic */
  protected onInit(): void {}

  /** Override in subclass for additional destroy logic */
  protected onDestroy(): void {}

  // --- Text lookup ---
  t(path: string): string {
    return this.textService.getText(this.texts, path);
  }

  /** Speaker label used when the dialogue is from/about the player.
   *  Renders as "PlayerName (you)" so it's unambiguous which lines belong to the player. */
  get playerSpeaker(): string {
    const name = this.textService.getPlayerName();
    return name ? `${name} (you)` : 'You (you)';
  }

  // --- Sound ---
  playSound(soundFile: string, maxDurationMs?: number): void {
    const audio = new Audio(`/assets/audio/${soundFile}`);
    this.activeAudioInstances.push(audio);
    audio.onended = () => {
      const idx = this.activeAudioInstances.indexOf(audio);
      if (idx > -1) this.activeAudioInstances.splice(idx, 1);
    };
    audio.play().catch(error => console.error('Audio play error', error));
    if (maxDurationMs && maxDurationMs > 0) {
      // Cap duration so the SFX matches the visible action.
      setTimeout(() => {
        if (!audio.paused) {
          audio.pause();
          audio.currentTime = 0;
          const idx = this.activeAudioInstances.indexOf(audio);
          if (idx > -1) this.activeAudioInstances.splice(idx, 1);
        }
      }, maxDurationMs);
    }
  }

  fadeOutAllSounds(duration: number = 400): void {
    const step = 50;
    const steps = duration / step;
    this.ngZone.runOutsideAngular(() => {
      for (const audio of [...this.activeAudioInstances]) {
        const volumeStep = audio.volume / steps;
        const fade = setInterval(() => {
          if (audio.volume > volumeStep) {
            audio.volume -= volumeStep;
          } else {
            audio.volume = 0;
            audio.pause();
            clearInterval(fade);
            const idx = this.activeAudioInstances.indexOf(audio);
            if (idx > -1) this.activeAudioInstances.splice(idx, 1);
          }
        }, step);
      }
    });
  }

  playDoorSound(): void {
    if (this.doorSound) {
      this.doorSound.currentTime = 0;
      this.doorSound.play().catch(() => {});
    } else {
      this.playSound('door-open.wav');
    }
  }

  playStepSound(): void {
    if (this.stepSound) {
      this.stepSound.currentTime = 0;
      this.stepSound.play().catch(() => {});
    } else {
      this.playSound('step.wav');
    }
  }

  // --- Image preloading ---
  protected async preloadImages(urls: string[]): Promise<void> {
    this.isPreloading = true;
    const promises = urls.filter(Boolean).map(path => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = path;
      });
    });
    await Promise.all(promises);
    this.isPreloading = false;
  }

  // --- Dialogue / Typewriter ---
  showDialogue(dialogue: Dialogue): void {
    // A dialogue opening means the player is no longer hovering a character
    // (they clicked one, or it auto-triggered). Clear any visible hover
    // overlay so a character's close-up can't stay stuck over the scene while
    // the dialogue is up — even if the pointer never leaves the hotspot (so no
    // mouseleave fires). See clearCharacterHover() / onCharacterLeave().
    this.clearCharacterHover();
    this.fadeOutAllSounds();
    this.activeDialogue = dialogue;
    this.startTypewriter();
  }

  startTypewriter(): void {
    if (!this.activeDialogue) return;
    if (this.dialogueInterval) clearInterval(this.dialogueInterval);
    this.isTyping = true;
    this.displayedDialogueText = '';
    const fullText = this.activeDialogue.text;
    let i = 0;
    this.ngZone.runOutsideAngular(() => {
      this.dialogueInterval = setInterval(() => {
        if (i < fullText.length) {
          this.displayedDialogueText += fullText.charAt(i);
          i++;
          try { this.cdr.detectChanges(); }
          catch { clearInterval(this.dialogueInterval); }
        } else {
          clearInterval(this.dialogueInterval);
          // Re-enter zone so Angular properly initializes event bindings
          // on the Continue/Start Quiz buttons that appear when isTyping=false
          this.ngZone.run(() => { this.isTyping = false; });
        }
      }, this.config.typewriterSpeed);
    });
  }

  skipTyping(): void {
    if (!this.activeDialogue || !this.isTyping) return;
    clearInterval(this.dialogueInterval);
    this.displayedDialogueText = this.activeDialogue.text;
    this.isTyping = false;
  }

  // --- Zoom ---
  applyZoom(hotspotKey: string, hotspots: { [key: string]: HotspotRect }, zoomLevel?: number): void {
    const hotspot = hotspots[hotspotKey];
    if (!hotspot) return;
    const level = zoomLevel ?? this.config.defaultZoomLevel;
    const originX = hotspot.x + hotspot.width / 2;
    const originY = hotspot.y + hotspot.height / 2;
    this.zoomStyle = {
      'transform': `scale(${level})`,
      'transform-origin': `${originX}% ${originY}%`
    };
  }

  resetZoom(instant: boolean = false): void {
    if (instant) {
      // Skip CSS transform transition so the new scene image isn't scaled
      this.zoomStyle = {
        'transform': 'scale(1)',
        'transform-origin': 'center center',
        'transition': 'filter 0.5s ease-in-out, background-image 0.2s linear'
      };
      // Restore normal transition after browser paints at scale(1)
      setTimeout(() => {
        this.zoomStyle = {
          'transform': 'scale(1)',
          'transform-origin': 'center center'
        };
      }, 50);
    } else {
      this.zoomStyle = {
        'transform': 'scale(1)',
        'transform-origin': 'center center'
      };
    }
  }

  // --- Fullscreen ---
  toggleFullscreen(): void {
    if (!this.document.fullscreenElement) {
      this.document.documentElement.requestFullscreen();
    } else {
      this.document.exitFullscreen();
    }
  }

  private onFullscreenChange = (): void => {
    this.isFullscreen = !!this.document.fullscreenElement;
    // Hide/show toolbar in fullscreen for full immersion
    this.document.body.classList.toggle('escape-room-fullscreen', this.isFullscreen);
  };

  // --- Intro popup ---
  closeIntroPopup(): void {
    this.isIntroPopupVisible = false;
    this.onIntroPopupClosed();
  }

  /** Override to add behavior after intro popup closes */
  protected onIntroPopupClosed(): void {}

  // --- Exit confirmation ---
  confirmExit(): void {
    this.dialog.open(ConfirmExitDialogComponent).afterClosed().subscribe(result => {
      if (result) {
        // Exit fullscreen when leaving escape room
        if (this.document.fullscreenElement) {
          this.document.exitFullscreen().catch(() => {});
        }
        this.document.body.classList.remove('escape-room-fullscreen');
        if (this.isLearningMode) {
          this.router.navigate(['/learning/flow']);
        } else {
          this.router.navigate(['/escape-rooms']);
        }
      }
    });
  }

  // --- Zoom-to-location helper ---
  /** Plays preloaded step sound immediately, delays zoom animation start, and invokes `onArrival` after the animation completes. */
  protected zoomToLocation(
    hotspotKey: string,
    hotspots: { [key: string]: HotspotRect },
    onArrival: () => void,
    zoomLevel?: number
  ): void {
    this.isAnimating = true;
    this.showHints = false;
    this.playStepSound();
    setTimeout(() => this.applyZoom(hotspotKey, hotspots, zoomLevel), ESCAPE_ROOM_TIMING.stepSoundDelay);
    setTimeout(() => {
      try {
        onArrival();
      } finally {
        this.isAnimating = false;
      }
    }, ESCAPE_ROOM_TIMING.stepSoundDelay + ESCAPE_ROOM_TIMING.zoomInDuration);
  }

  // --- Hint pulse ---
  /** Starts the hint-pulse timer — hides `showHints` after the configured duration. */
  protected showHintPulse(): void {
    setTimeout(() => this.showHints = false, ESCAPE_ROOM_TIMING.hintVisibleDuration);
  }

  // --- Idle hint attention (stuck-player nudge) ---
  /** Begins watching for player inactivity. After `idleHintDelay` ms with no
   *  click / tap / key-press inside the room (moving the mouse alone does NOT
   *  count) — and only while the game is waiting on the player (see
   *  `canShowIdleHint`) — the host gains
   *  `.idle-hint-attention`, which the shared SCSS uses to escalate the hint
   *  button's ambient pulse into a stronger wiggle + glow. Listeners are
   *  passive and run outside Angular, and the watcher only toggles a DOM
   *  class (the animation is CSS-driven), so this adds no change-detection
   *  overhead. */
  private startIdleHintWatcher(): void {
    this.lastInteractionTs = Date.now();
    const host = this.hostEl.nativeElement as HTMLElement;
    this.ngZone.runOutsideAngular(() => {
      // Only deliberate interactions reset the timer — a press/tap or a key.
      // Plain pointer MOVEMENT (and wheel scroll) is intentionally excluded: a
      // player sweeping the cursor around hunting for what to click is exactly
      // who the nudge is for, so moving the mouse without clicking must not
      // keep the timer alive.
      host.addEventListener('pointerdown', this.onRoomActivity, { passive: true });
      host.addEventListener('touchstart', this.onRoomActivity, { passive: true });
      host.addEventListener('keydown', this.onRoomActivity, { passive: true });
      this.idleHintInterval = setInterval(
        () => this.tickIdleHint(host),
        ESCAPE_ROOM_TIMING.idleHintPollInterval
      );
    });
  }

  private tickIdleHint(host: HTMLElement): void {
    const now = Date.now();
    const idleMs = now - this.lastInteractionTs;
    const interactiveIdle = this.canShowIdleHint();
    // Stage 1 (idleHintDelay ~15s): escalate the hint button's ambient pulse.
    const shouldShow = idleMs >= ESCAPE_ROOM_TIMING.idleHintDelay && interactiveIdle;
    if (shouldShow !== this.idleHintShown) {
      this.idleHintShown = shouldShow;
      host.classList.toggle('idle-hint-attention', shouldShow);
    }
    // Inline hint bubble: while the player keeps making NO progress, re-pop a
    // short italic snippet of the current hint next to the (pulsing) button —
    // first at idleHintDelay, then again every hintBubbleRepeatInterval — so they
    // keep being reminded help is there. Suppressed while it's already up or the
    // stronger idle popup is open; re-armed on interaction (onRoomActivity).
    if (shouldShow && !this.isHintBubbleVisible && !this.idleHintDialogRef
        && (now - this.lastHintBubbleTs) >= ESCAPE_ROOM_TIMING.hintBubbleRepeatInterval) {
      this.lastHintBubbleTs = now;
      // tickIdleHint runs OUTSIDE Angular — re-enter the zone to render the bubble.
      this.ngZone.run(() => this.showHintBubble(this.getHintText()));
    }
    // Stage 2 (idleHintPopupDelay ~30s): once per stuck period, pop a dialog that
    // explicitly tells the player about the hint button. Re-arms on interaction.
    if (!this.idleHintPopupShown && idleMs >= ESCAPE_ROOM_TIMING.idleHintPopupDelay && interactiveIdle) {
      this.idleHintPopupShown = true;
      this.openIdleHintPopup();
    }
  }

  /** Open the one-time idle hint popup. The idle watcher ticks OUTSIDE Angular,
   *  so re-enter the zone for the dialog. Suppressed if another dialog is open. */
  private openIdleHintPopup(): void {
    if (this.dialog.openDialogs.length > 0) return;
    this.ngZone.run(() => {
      this.idleHintDialogRef = this.dialog.open(IdleHintDialogComponent, {
        width: '460px', maxWidth: '92vw', autoFocus: false,
        // A nudge, not a wall: NO backdrop, so the player can keep hovering and
        // clicking the scene behind it; anchored to the top so it never covers
        // the play area / hotspots. Auto-dismissed by onRoomActivity on any click.
        hasBackdrop: false,
        position: { top: '80px' },
      });
      this.idleHintDialogRef.afterClosed().subscribe(() => { this.idleHintDialogRef = null; });
    });
  }

  /** Whether the idle hint-attention cue may show right now. Gated to
   *  interactive "waiting for the player" states so it never fires during
   *  intros, dialogue, zoom animations, reveal/skip overlays or completion,
   *  nor while a player-requested hint pulse is already showing. Override to
   *  add room-specific gating. */
  protected canShowIdleHint(): boolean {
    return !this.isPreloading
      && !this.isIntroPopupVisible
      && !this.isGameCompleteOverlayVisible
      && !this.activeDialogue
      && !this.isQuizActive          // not during a puzzle/quiz (or a room's reading popup, e.g. critical-thinking's TV reviews)
      && !this.isAnimating
      && !this.showAnswerOverlay
      && !this.showSkipConfirm
      && !this.showHints;
  }

  /** Clears any active idle attention and restarts the idle timer. */
  protected resetIdleHint(): void {
    this.lastInteractionTs = Date.now();
    this.lastHintBubbleTs = 0;
    if (this.idleHintShown) {
      this.idleHintShown = false;
      (this.hostEl.nativeElement as HTMLElement).classList.remove('idle-hint-attention');
    }
  }

  // --- Answer overlay ---
  closeAnswerOverlay(): void {
    this.showAnswerOverlay = false;
    this.puzzleFeedback = '';
    if (this.answerOverlayCallback) {
      this.answerOverlayCallback();
      this.answerOverlayCallback = null;
    }
  }

  // --- 3-attempt reveal helper ---
  handleWrongAttempt(
    attemptsRef: { count: number },
    maxAttempts: number,
    onReveal: () => void,
    hintText: string,
    revealText: string,
    shakeTimeout: number = ESCAPE_ROOM_TIMING.shakeTimeout
  ): void {
    this.playSound('error-buzz.mp3');
    this.isPuzzleWrong = true;
    attemptsRef.count++;

    if (attemptsRef.count >= maxAttempts) {
      this.answerOverlayText = revealText;
      this.answerOverlayCallback = () => {
        attemptsRef.count = 0;
        onReveal();
      };
      this.showAnswerOverlay = true;
    } else {
      this.puzzleFeedback = hintText;
    }

    setTimeout(() => this.isPuzzleWrong = false, shakeTimeout);
  }

  // --- Skip puzzle ---

  requestSkipPuzzle(onSkip: () => void): void {
    this.skipPuzzleCallback = onSkip;
    this.showSkipConfirm = true;
  }

  confirmSkipPuzzle(): void {
    this.showSkipConfirm = false;
    if (this.skipPuzzleCallback) {
      this.skipPuzzleCallback();
      this.skipPuzzleCallback = null;
    }
  }

  cancelSkipPuzzle(): void {
    this.showSkipConfirm = false;
    this.skipPuzzleCallback = null;
  }

  // --- Scoring helpers (Phase 3) ---

  protected recordPuzzleScore(puzzleId: string, wrongAttempts: number, wasRevealed: boolean): void {
    const score = calculatePuzzleScore(wrongAttempts, wasRevealed);
    this.puzzleScores.push({ puzzleId, wrongAttempts, wasRevealed, score });
  }

  protected finalizeAndReportScore(): void {
    this.learningOverallScore = calculateOverallRoomScore(this.puzzleScores);
    if (this.isLearningMode) {
      const roomScore: RoomScore = {
        roomId: this.config.roomId,
        puzzleScores: [...this.puzzleScores],
        overallScore: this.learningOverallScore,
        completedAt: new Date().toISOString(),
      };
      this.learningFlowService.saveRoomScore(roomScore);
    }
  }

  protected getOverallScore(): number {
    return calculateOverallRoomScore(this.puzzleScores);
  }

  get completedPuzzleCount(): number {
    return this.puzzleScores.length;
  }

  get runningScore(): number {
    if (this.puzzleScores.length === 0) return 0;
    return calculateOverallRoomScore(this.puzzleScores);
  }

  /** Score-based feedback message for completion overlay */
  get scoreMessage(): string {
    const score = this.learningOverallScore;
    if (this.puzzleScores.length === 0) return '';
    if (score >= 90) return 'Outstanding performance! You have mastered this skill.';
    if (score >= 80) return 'Great job! You have a strong understanding of this skill.';
    if (score >= 60) return 'Good effort! Consider reviewing the module material to strengthen your knowledge.';
    return 'You completed the room, but we recommend studying the module PDF for this skill.';
  }

  returnToLearningFlow(): void {
    // Exit fullscreen when leaving
    if (this.document.fullscreenElement) {
      this.document.exitFullscreen().catch(() => {});
    }
    this.document.body.classList.remove('escape-room-fullscreen');
    this.router.navigate(['/learning/flow']);
  }
}

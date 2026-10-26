import { Component, Inject, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { EscapeRoomBaseComponent } from '../shared/escape-room/escape-room-base.component';
import { EscapeRoomTextService } from '../shared/escape-room/escape-room-text.service';
import { fadeInOut } from '../shared/escape-room/escape-room.animations';
import { EscapeRoomConfig, ESCAPE_ROOM_TIMING } from '../shared/escape-room/escape-room.interfaces';

import { RoomHelpButtonComponent } from '../shared/escape-room/room-help-button/room-help-button.component';
// ── Game States ──
enum GameState {
  Intro,
  FixCables,           // Click broken cables → thought → remove → grab new → unwrap → connect
  CablesRemoved,
  CablesUnwrapped,
  CablesConnected,
  ServerBoot,          // Server boots, login, guidelines screen
  PasswordAudit,       // Puzzle 1: classify 11 passwords
  PasswordAuditDone,
  OpenMonitor,         // Click monitor
  ReadSecurityNotice,  // Read IT security notice → archive
  PhishingInbox,       // Puzzle 2: 5 emails
  PhishingDone,
  OpenPhone,           // Click smartphone
  SocialPost,          // Puzzle 3: fix draft post (3 sub-steps)
  SocialPostDone,
  Comments,            // Puzzle 4: moderate 3 comments
  CommentsDone,
  StickyNote,          // Mini: password sticky note
  MiniUSB,             // Mini: USB stick
  MiniAd,              // Mini: flashy ad popup
  MiniUpdate,          // Mini: system update
  MiniWifi,            // Mini: WiFi choice
  AllComplete,
  Completion
}

type ViewState = 'main' | 'cables' | 'server' | 'monitor' | 'phone' | 'drawer' | 'bag' | 'posters';

const imagePaths = {
  base: '/assets/images/digital_skills/it_department.png',
  base_door_open: '/assets/images/digital_skills/it_department_door_open.png',
  zoom_cables: '/assets/images/digital_skills/zoom_cables.png',
  zoom_server: '/assets/images/digital_skills/zoom_server.png',
  zoom_monitor: '/assets/images/digital_skills/zoom_monitor.png',
  zoom_phone: '/assets/images/digital_skills/zoom_phone.png',
  zoom_drawer: '/assets/images/digital_skills/zoom_drawer.png',
  zoom_bag: '/assets/images/digital_skills/zoom_bag.png',
  zoom_posters: '/assets/images/digital_skills/zoom_posters.png',
};

const roomConfig: EscapeRoomConfig = {
  roomId: 'digital-skills',
  typewriterSpeed: 25,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: true,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
    selector: 'app-digital-skills-module5',
    templateUrl: './digital-skills-module5.component.html',
    styleUrl: './digital-skills-module5.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class DigitalSkillsModule5Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  // TrackBy functions
  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;
  trackByKey = (_: number, item: { key: string }) => item.key;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'main';

  // Hint system
  public isHintDialogue: boolean = false;

  // ── Hotspots ──
  hotspots = {
    main: {
      cables: { x: 43, y: 44, width: 18, height: 43 },
      server: { x: 28, y: 22, width: 11, height: 51 },
      monitor: { x: 68, y: 43, width: 11, height: 12 },
      phone: { x: 81, y: 54, width: 2, height: 5 },
      drawer: { x: 70, y: 61, width: 9, height: 21 },
      bag:      { x: 22, y: 38, width: 10, height: 20 },
      posters:  { x: 76, y: 20, width: 16, height: 30 },
      stickyNote: { x: 13, y: 33, width: 3, height: 6 },
      exitDoor: { x: 7, y: 21, width: 15, height: 52 },
    },
    cables_zoom: {
      brokenCables: { x: 11, y: 37, width: 54, height: 28 },
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    server_zoom: {
      loginButton: { x: 35, y: 55, width: 30, height: 15 },
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    monitor_zoom: {
      emailClient: { x: 20, y: 20, width: 60, height: 60 },
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    phone_zoom: {
      socialApp: { x: 20, y: 36, width: 66, height: 49 },
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    drawer_zoom: {
      usb: { x: 35, y: 50, width: 30, height: 25 },
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    bag_zoom: {
      contents: { x: 25, y: 30, width: 50, height: 50 },
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    posters_zoom: {
      padlock:   { x: 10, y: 20, width: 25, height: 50 },
      cat:       { x: 38, y: 20, width: 25, height: 50 },
      handshake: { x: 77, y: 39, width: 10, height: 20 },
    }
  };

  // ── Item popup visibility ──
  isLeafletVisible: boolean = false;
  isCoffeeMugVisible: boolean = false;
  isPasswordListVisible: boolean = false;
  isMouseInWallVisible: boolean = false;
  isBagContentsVisible: boolean = false;

  // ── Red herring found flags ──
  hasFoundLeaflet: boolean = false;
  hasFoundCoffeeMug: boolean = false;

  // ── Puzzle 1: Password Audit ──
  passwordIndex: number = 0;
  passwordTotalWrong: number = 0;
  passwordWrongAttempts: number = 0;
  passwordWasRevealed: boolean = false;
  passwordFeedback: string = '';
  passwordFeedbackCorrect: boolean = false;
  readonly passwordCount: number = 11;

  get currentPasswordValue(): string {
    return this.t('puzzles.passwordAudit.passwords.' + this.passwordIndex + '.value');
  }

  get currentPasswordCorrect(): string {
    return this.t('puzzles.passwordAudit.passwords.' + this.passwordIndex + '.correct');
  }

  // ── Puzzle 2: Phishing Inbox ──
  emailIndex: number = 0;
  emailTotalWrong: number = 0;
  emailWrongAttempts: number = 0;
  emailWasRevealed: boolean = false;
  emailFeedback: string = '';
  emailFeedbackCorrect: boolean = false;
  showEmailDetails: boolean = false;
  readonly emailCount: number = 5;

  get currentEmailSubject(): string {
    return this.t('puzzles.phishing.emails.' + this.emailIndex + '.subject');
  }
  get currentEmailSender(): string {
    return this.t('puzzles.phishing.emails.' + this.emailIndex + '.sender');
  }
  get currentEmailSenderReal(): string {
    return this.t('puzzles.phishing.emails.' + this.emailIndex + '.senderReal');
  }
  get currentEmailPreview(): string {
    return this.t('puzzles.phishing.emails.' + this.emailIndex + '.preview');
  }
  get currentEmailLinkText(): string {
    return this.t('puzzles.phishing.emails.' + this.emailIndex + '.linkText');
  }
  get currentEmailLinkReal(): string {
    return this.t('puzzles.phishing.emails.' + this.emailIndex + '.linkReal');
  }

  // ── Puzzle 3: Social Post (3 sub-steps: caption, image, hashtags) ──
  socialPostStep: number = 0; // 0=caption, 1=image, 2=hashtags
  socialPostTotalWrong: number = 0;
  socialPostWrongAttempts: number = 0;
  socialPostWasRevealed: boolean = false;
  socialPostFeedback: string = '';
  socialPostFeedbackCorrect: boolean = false;

  get socialPostSubStepLabel(): string {
    if (this.socialPostStep === 0) return this.t('puzzles.socialPost.captionLabel');
    if (this.socialPostStep === 1) return this.t('puzzles.socialPost.imageLabel');
    return this.t('puzzles.socialPost.hashtagLabel');
  }

  get socialPostSubStepInstruction(): string {
    if (this.socialPostStep === 0) return this.t('puzzles.socialPost.captionInstruction');
    if (this.socialPostStep === 1) return this.t('puzzles.socialPost.imageInstruction');
    return this.t('puzzles.socialPost.hashtagInstruction');
  }

  get socialPostOptions(): { id: string; text: string }[] {
    const prefix = this.socialPostStep === 0 ? 'puzzles.socialPost.captionOptions'
                 : this.socialPostStep === 1 ? 'puzzles.socialPost.imageOptions'
                 : 'puzzles.socialPost.hashtagOptions';
    return [
      { id: 'a', text: this.t(prefix + '.a') },
      { id: 'b', text: this.t(prefix + '.b') },
      { id: 'c', text: this.t(prefix + '.c') },
      { id: 'd', text: this.t(prefix + '.d') },
    ];
  }

  get socialPostCorrectAnswer(): string {
    if (this.socialPostStep === 0) return this.t('puzzles.socialPost.captionCorrect');
    if (this.socialPostStep === 1) return this.t('puzzles.socialPost.imageCorrect');
    return this.t('puzzles.socialPost.hashtagCorrect');
  }

  // ── Puzzle 4: Comments ──
  commentIndex: number = 0;
  commentTotalWrong: number = 0;
  commentWrongAttempts: number = 0;
  commentWasRevealed: boolean = false;
  commentFeedback: string = '';
  commentFeedbackCorrect: boolean = false;
  readonly commentCount: number = 3;

  get currentCommentAuthor(): string {
    return this.t('puzzles.comments.comments.' + this.commentIndex + '.author');
  }
  get currentCommentText(): string {
    return this.t('puzzles.comments.comments.' + this.commentIndex + '.text');
  }

  // ── Mini puzzle states ──
  miniPuzzlePhase: 'usb' | 'ad' | 'update' | 'wifi' | null = null;
  /** StickyNote beat: false = note still to be found in the room (hotspot
   *  visible), true = the player read it and the shred/keep card is shown.
   *  Set on dismissal of system_stickyNoteFound. The component is created
   *  fresh per visit (no in-room restart path), so no reset is needed. */
  stickyNoteOpened: boolean = false;
  isMalwareInfected: boolean = false;
  miniPuzzleFeedback: string = '';
  miniPuzzleFeedbackCorrect: boolean = false;

  // ── Cable fix sub-state ──
  cableSubState: 'broken' | 'removed' | 'unwrapped' | 'connected' = 'broken';

  // ── No characters in this room ──
  override get characterImages() { return {}; }

  public override get isMainViewActive(): boolean {
    return this.currentView === 'main';
  }

  public override get isQuizActive(): boolean {
    return this.currentState === GameState.PasswordAudit ||
      this.currentState === GameState.PhishingInbox ||
      this.currentState === GameState.SocialPost ||
      this.currentState === GameState.Comments ||
      // Two-beat mini puzzles: the hotspot layer is gated on !isQuizActive, so
      // these must NOT count as a quiz until the player has found the object —
      // otherwise the sticky-note / drawer hotspots never render (soft-lock
      // "after the bag", partner report 2026-08).
      (this.currentState === GameState.StickyNote && this.stickyNoteOpened) ||
      (this.currentState === GameState.MiniUSB && this.currentView === 'drawer') ||
      this.currentState === GameState.MiniAd ||
      this.currentState === GameState.MiniUpdate ||
      this.currentState === GameState.MiniWifi;
  }

  constructor(
    @Inject(DOCUMENT) document: Document,
    router: Router,
    dialog: MatDialog,
    textService: EscapeRoomTextService
  ) {
    super(document, router, dialog, textService);
    this.currentBackgroundUrl = imagePaths.base;
  }

  protected override onInit(): void {
    this.preloadImages(Object.values(imagePaths));
  }

  // ── Background ──
  override updateBackground(): void {
    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }

    switch (this.currentView) {
      case 'cables':  this.currentBackgroundUrl = imagePaths.zoom_cables; break;
      case 'server':  this.currentBackgroundUrl = imagePaths.zoom_server; break;
      case 'monitor': this.currentBackgroundUrl = imagePaths.zoom_monitor; break;
      case 'phone':   this.currentBackgroundUrl = imagePaths.zoom_phone; break;
      case 'drawer':  this.currentBackgroundUrl = imagePaths.zoom_drawer; break;
      case 'bag':     this.currentBackgroundUrl = imagePaths.zoom_bag; break;
      case 'posters': this.currentBackgroundUrl = imagePaths.zoom_posters; break;
      default:        this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  // ── Hints ──
  protected override onHintRequested(): void {
    this.isHintDialogue = true;
  }

  protected override getHintText(): string {
    switch (this.currentState) {
      case GameState.Intro:           return this.t('hints.intro');
      case GameState.FixCables:
      case GameState.CablesRemoved:
      case GameState.CablesUnwrapped:
      case GameState.CablesConnected: return this.t('hints.fixCables');
      case GameState.ServerBoot:      return this.t('hints.serverBoot');
      case GameState.PasswordAudit:   return this.t('hints.passwordAudit');
      case GameState.PasswordAuditDone:
      case GameState.OpenMonitor:     return this.t('hints.openMonitor');
      case GameState.ReadSecurityNotice: return this.t('hints.readSecurityNotice');
      case GameState.PhishingInbox:   return this.t('hints.phishing');
      case GameState.PhishingDone:
      case GameState.OpenPhone:       return this.t('hints.openPhone');
      case GameState.SocialPost:      return this.t('hints.socialPost');
      case GameState.SocialPostDone:
      case GameState.Comments:        return this.t('hints.comments');
      case GameState.StickyNote:      return this.t('hints.stickyNote');
      case GameState.MiniUSB:         return this.currentView === 'drawer'
                                        ? this.t('hints.miniPuzzles')
                                        : this.t('hints.miniUsb');
      case GameState.MiniAd:
      case GameState.MiniUpdate:
      case GameState.MiniWifi:        return this.t('hints.miniPuzzles');
      case GameState.AllComplete:     return this.t('hints.allComplete');
      case GameState.Completion:      return this.t('hints.completion');
      default:                        return this.t('hints.default');
    }
  }

  // ── Zoom reset ──
  protected override resetZoomState(): void {
    this.currentView = 'main';
  }

  // ── Intro popup closed ──
  protected override onIntroPopupClosed(): void {
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.selfTalk'), id: 'system_selfTalk' });
  }

  // ── Hotspot clicks ──
  override onHotspotClick(target: string): void {
    this.showHints = false;
    if (this.activeDialogue) return;

    // Exit door
    if (target === 'exitDoor' && this.isDoorOpen && this.currentState === GameState.Completion) {
      this.playSound('success-chime.wav');
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
      return;
    }

    // ── Main view hotspots ──
    if (this.currentView === 'main') {
      // Cables / Server area
      if (target === 'cables' && this.currentState === GameState.FixCables) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'cables';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }

      // Server (after cables fixed)
      if (target === 'server' && this.currentState === GameState.ServerBoot) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'server';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }

      // Monitor (after password audit)
      if (target === 'monitor' && this.currentState === GameState.OpenMonitor) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'monitor';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }

      // Phone (after phishing)
      if (target === 'phone' && this.currentState === GameState.OpenPhone) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'phone';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }

      // Sticky note on server
      if (target === 'stickyNote' && this.currentState === GameState.StickyNote) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.stickyNoteFound'), id: 'system_stickyNoteFound' });
        return;
      }

      // Drawer (red herring + USB mini puzzle)
      if (target === 'drawer') {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'drawer';
          this.updateBackground();
          this.resetZoom(true);
          // MiniUSB: once in the drawer view isQuizActive is true (hotspot layer
          // hidden, so the drawerContent zoom hotspot never renders) — open the
          // USB beat here. Shown synchronously so the USB card (which needs
          // !activeDialogue) cannot flash before the dialogue.
          if (this.currentState === GameState.MiniUSB) {
            this.playSound('paper-rustle.wav');
            this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.usbFound'), id: 'system_usbFound' });
          }
        }, 2.5);
        return;
      }

      // Bag (red herring)
      if (target === 'bag') {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'bag';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }

      // Posters (red herring)
      if (target === 'posters') {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'posters';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }
    }

    // ── Clicks within zoomed views ──

    // --- Clicks within zoomed views (content hotspots) ---
    if (this.currentView === 'cables' && target === 'cablesContent' && this.currentState === GameState.FixCables) {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.cablesBroken'), id: 'system_cablesBroken' });
      return;
    }
    if (this.currentView === 'server' && target === 'serverContent' && this.currentState === GameState.ServerBoot) {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.serverLoggedIn'), id: 'system_serverLoggedIn' });
      return;
    }
    if (this.currentView === 'monitor' && target === 'monitorContent' && this.currentState === GameState.OpenMonitor) {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.monitorOpened'), id: 'system_monitorOpened' });
      return;
    }
    if (this.currentView === 'phone' && target === 'phoneContent' && this.currentState === GameState.OpenPhone) {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.phoneOpened'), id: 'system_phoneOpened' });
      return;
    }
    if (this.currentView === 'drawer' && target === 'drawerContent') {
      this.playSound('paper-rustle.wav');
      if (this.currentState === GameState.MiniUSB) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.usbFound'), id: 'system_usbFound' });
      } else if (!this.isPasswordListVisible && !this.hasFoundLeaflet) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.passwordListFound'), id: 'system_passwordListFound' });
      }
      return;
    }
    if (this.currentView === 'bag' && target === 'bagContent') {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.bagContents'), id: 'system_bagContents' });
      return;
    }

    // Cable sub-interactions
    if (this.currentView === 'cables' && target === 'brokenCables') {
      if (this.cableSubState === 'broken') {
        this.cableSubState = 'removed';
        this.playSound('paper-rustle.wav');
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.cablesRemoved'), id: 'system_cablesRemoved' });
      }
      return;
    }

    if (this.currentView === 'cables' && target === 'newCables') {
      if (this.cableSubState === 'removed') {
        this.cableSubState = 'unwrapped';
        this.playSound('paper-rustle.wav');
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.cablesUnwrapped'), id: 'system_cablesUnwrapped' });
      }
      return;
    }

    if (this.currentView === 'cables' && target === 'connectCables') {
      if (this.cableSubState === 'unwrapped') {
        this.cableSubState = 'connected';
        this.playSound('success-chime.wav');
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.cablesConnected'), id: 'system_cablesConnected' });
      }
      return;
    }

    // Poster sub-interactions
    if (this.currentView === 'posters') {
      if (target === 'padlock') {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.posterPadlock'), id: 'system_posterPadlock' });
      } else if (target === 'cat') {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.posterCat'), id: 'system_posterCat' });
      } else if (target === 'handshake') {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.posterHandshake'), id: 'system_posterHandshake' });
      }
      return;
    }

    // Mouse in wall (red herring on main)
    if (target === 'mouseInWall') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.mouseInWall'), id: 'system_mouseInWall' });
      return;
    }

    // Coffee mug (red herring on main)
    if (target === 'coffeeMug') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.coffeeMugRead'), id: 'system_coffeeMugRead' });
      return;
    }

    // Leaflet (red herring on main)
    if (target === 'leaflet') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.leafletRead'), id: 'system_leafletRead' });
      return;
    }
  }

  // ── Dialogue dismissal ──
  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;
    this.updateBackground();

    if (this.isHintDialogue) {
      this.isHintDialogue = false;
      this.showHintPulse();
    } else {
      this.showHints = false;
    }

    // Ensure we go back to main after non-zoom dialogues
    if (id === 'system_selfTalk') {
      this.currentState = GameState.FixCables;
    }

    // Cable fix chain
    else if (id === 'system_cablesBroken') {
      // Player should click broken cables in zoomed view
    }
    else if (id === 'system_cablesRemoved') {
      // Player should click new cables
    }
    else if (id === 'system_cablesUnwrapped') {
      // Player should click connect
    }
    else if (id === 'system_cablesConnected') {
      this.currentState = GameState.ServerBoot;
      this.goBack();
    }

    // Server login → password audit
    else if (id === 'system_serverLoggedIn') {
      this.currentState = GameState.PasswordAudit;
    }

    // Password audit done → go to monitor
    else if (id === 'system_passwordAuditComplete') {
      this.currentState = GameState.OpenMonitor;
      if (this.currentView !== 'main') {
        this.goBack();
      }
    }

    // Monitor opened → read security notice
    else if (id === 'system_monitorOpened') {
      this.currentState = GameState.ReadSecurityNotice;
    }

    // Security notice read → archive → phishing emails
    else if (id === 'system_securityNoticeRead') {
      this.currentState = GameState.PhishingInbox;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.emailsArrived'), id: 'system_emailsArrived' });
    }
    else if (id === 'system_emailsArrived') {
      // Phishing puzzle starts
    }

    // Phishing done → go to phone
    else if (id === 'system_phishingComplete') {
      this.currentState = GameState.OpenPhone;
      if (this.currentView !== 'main') {
        this.goBack();
      }
    }

    // Phone opened → social post puzzle
    else if (id === 'system_phoneOpened') {
      this.currentState = GameState.SocialPost;
    }

    // Social post done → comments
    else if (id === 'system_postReviewed') {
      this.currentState = GameState.Comments;
    }

    // Comments done → sticky note
    else if (id === 'system_commentsComplete') {
      this.currentState = GameState.StickyNote;
      if (this.currentView !== 'main') {
        this.goBack();
      }
    }

    // Sticky note found → show puzzle
    else if (id === 'system_stickyNoteFound') {
      // Flips isQuizActive on (hotspot layer hides, room blurs) and satisfies
      // the sticky-note card's *ngIf.
      this.stickyNoteOpened = true;
    }

    // Sticky note result
    else if (id === 'system_stickyNoteShredded' || id === 'system_stickyNoteKept') {
      this.currentState = GameState.MiniUSB;
    }

    // USB found → show mini puzzle
    else if (id === 'system_usbFound') {
      // Mini puzzle overlay will show
    }

    // USB result
    else if (id === 'system_usbIgnored') {
      this.currentState = GameState.MiniAd;
      if (this.currentView !== 'main') {
        this.goBack();
      }
      setTimeout(() => {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.adPopup'), id: 'system_adPopup' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }
    else if (id === 'system_usbPluggedIn') {
      this.isMalwareInfected = true;
    }
    else if (id === 'system_malwareRecovery_usb') {
      this.isMalwareInfected = false;
      this.currentState = GameState.MiniAd;
      if (this.currentView !== 'main') {
        this.goBack();
      }
      setTimeout(() => {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.adPopup'), id: 'system_adPopup' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }

    // Ad popup → show mini puzzle
    else if (id === 'system_adPopup') {
      // Mini puzzle overlay will show
    }

    // Ad result
    else if (id === 'system_adClosed') {
      this.currentState = GameState.MiniUpdate;
      setTimeout(() => {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.systemUpdate'), id: 'system_systemUpdate' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }
    else if (id === 'system_adClicked') {
      this.isMalwareInfected = true;
    }
    else if (id === 'system_malwareRecovery_ad') {
      this.isMalwareInfected = false;
      this.currentState = GameState.MiniUpdate;
      setTimeout(() => {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.systemUpdate'), id: 'system_systemUpdate' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }

    // System update → show mini puzzle
    else if (id === 'system_systemUpdate') {
      // Mini puzzle overlay will show
    }

    // Update result
    else if (id === 'system_updateInstalled') {
      this.currentState = GameState.MiniWifi;
      setTimeout(() => {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.wifiPrompt'), id: 'system_wifiPrompt' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }
    else if (id === 'system_updatePostponed') {
      this.isMalwareInfected = true;
    }
    else if (id === 'system_malwareRecovery_update') {
      this.isMalwareInfected = false;
      this.currentState = GameState.MiniWifi;
      setTimeout(() => {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.wifiPrompt'), id: 'system_wifiPrompt' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }

    // WiFi prompt → show mini puzzle
    else if (id === 'system_wifiPrompt') {
      // Mini puzzle overlay will show
    }

    // WiFi result
    else if (id === 'system_wifiCompany') {
      this.currentState = GameState.AllComplete;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allComplete'), id: 'system_allComplete' });
    }
    else if (id === 'system_wifiFree') {
      this.isMalwareInfected = true;
    }
    else if (id === 'system_malwareRecovery_wifi') {
      this.isMalwareInfected = false;
      this.currentState = GameState.AllComplete;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allComplete'), id: 'system_allComplete' });
    }

    // All complete → door opens AND show completion overlay so the player isn't left
    // staring at a blurred scene wondering what to click next.
    else if (id === 'system_allComplete') {
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.playDoorSound();
      this.updateBackground();
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
      this.playSound('success-chime.wav');
    }

    // Red herrings — no state change needed
    else if (id === 'system_passwordListFound' || id === 'system_bagContents' ||
             id === 'system_posterPadlock' || id === 'system_posterCat' ||
             id === 'system_posterHandshake' || id === 'system_mouseInWall' ||
             id === 'system_coffeeMugRead' || id === 'system_leafletRead') {
      // Just dismiss, no state change
    }
  }

  /** Template-facing alias */
  handleDialogueDismiss(): void {
    this.dismissDialogue();
  }

  // ══════════════════════════════════════
  //  PUZZLE 1: Password Audit
  // ══════════════════════════════════════

  classifyPassword(choice: 'strong' | 'weak'): void {
    const correct = this.currentPasswordCorrect;
    if (choice === correct) {
      this.playSound('success-chime.wav');
      this.passwordFeedback = this.t('puzzles.passwordAudit.passwords.' + this.passwordIndex + '.feedbackCorrect');
      this.passwordFeedbackCorrect = true;
      this.passwordWrongAttempts = 0;

      setTimeout(() => {
        this.passwordFeedback = '';
        this.passwordFeedbackCorrect = false;
        this.passwordIndex++;
        if (this.passwordIndex >= this.passwordCount) {
          this.recordPuzzleScore('Password Audit', this.passwordTotalWrong, this.passwordWasRevealed);
          this.currentState = GameState.PasswordAuditDone;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.passwordAudit.allCorrect'), id: 'system_passwordAuditComplete' });
        }
      }, 1500);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.passwordWrongAttempts++;
      this.passwordTotalWrong++;
      this.passwordFeedback = this.t('puzzles.passwordAudit.passwords.' + this.passwordIndex + '.feedbackWrong');
      this.passwordFeedbackCorrect = false;

      if (this.passwordWrongAttempts >= 3) {
        this.passwordWasRevealed = true;
        this.answerOverlayText = this.t('puzzles.passwordAudit.answerOverlay');
        this.answerOverlayCallback = () => {
          this.passwordWrongAttempts = 0;
          // Reveal all remaining and complete
          this.passwordIndex = this.passwordCount;
          this.recordPuzzleScore('Password Audit', this.passwordTotalWrong, true);
          this.currentState = GameState.PasswordAuditDone;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.passwordAudit.allCorrect'), id: 'system_passwordAuditComplete' });
        };
        this.showAnswerOverlay = true;
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // ══════════════════════════════════════
  //  Security Notice (before phishing)
  // ══════════════════════════════════════

  archiveSecurityNotice(): void {
    this.playSound('paper-rustle.wav');
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.securityNoticeRead'), id: 'system_securityNoticeRead' });
  }

  // ══════════════════════════════════════
  //  PUZZLE 2: Phishing Inbox
  // ══════════════════════════════════════

  classifyEmail(choice: 'phishing' | 'legitimate'): void {
    const correct = this.t('puzzles.phishing.emails.' + this.emailIndex + '.correct');
    if (choice === correct) {
      this.playSound('success-chime.wav');
      this.emailFeedback = this.t('puzzles.phishing.emails.' + this.emailIndex + '.feedbackCorrect');
      this.emailFeedbackCorrect = true;
      this.emailWrongAttempts = 0;

      setTimeout(() => {
        this.emailFeedback = '';
        this.emailFeedbackCorrect = false;
        this.showEmailDetails = false;
        this.emailIndex++;
        if (this.emailIndex >= this.emailCount) {
          this.recordPuzzleScore('Phishing Detection', this.emailTotalWrong, this.emailWasRevealed);
          this.currentState = GameState.PhishingDone;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.phishingComplete'), id: 'system_phishingComplete' });
        }
      }, 1500);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.emailWrongAttempts++;
      this.emailTotalWrong++;
      this.emailFeedback = this.t('puzzles.phishing.emails.' + this.emailIndex + '.feedbackWrong');
      this.emailFeedbackCorrect = false;

      if (this.emailWrongAttempts >= 3) {
        this.emailWasRevealed = true;
        this.answerOverlayText = this.t('puzzles.phishing.answerOverlay');
        this.answerOverlayCallback = () => {
          this.emailWrongAttempts = 0;
          this.emailIndex = this.emailCount;
          this.recordPuzzleScore('Phishing Detection', this.emailTotalWrong, true);
          this.currentState = GameState.PhishingDone;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.phishingComplete'), id: 'system_phishingComplete' });
        };
        this.showAnswerOverlay = true;
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  toggleEmailDetails(): void {
    this.showEmailDetails = !this.showEmailDetails;
  }

  // ══════════════════════════════════════
  //  PUZZLE 3: Social Media Post
  // ══════════════════════════════════════

  submitSocialPostOption(opt: { id: string; text: string }): void {
    const correct = this.socialPostCorrectAnswer;
    if (opt.id === correct) {
      this.playSound('success-chime.wav');
      if (this.socialPostStep === 0) {
        this.socialPostFeedback = this.t('puzzles.socialPost.captionFeedbackCorrect');
      } else if (this.socialPostStep === 1) {
        this.socialPostFeedback = this.t('puzzles.socialPost.imageFeedbackCorrect');
      } else {
        this.socialPostFeedback = this.t('puzzles.socialPost.hashtagFeedbackCorrect');
      }
      this.socialPostFeedbackCorrect = true;
      this.socialPostWrongAttempts = 0;

      setTimeout(() => {
        this.socialPostFeedback = '';
        this.socialPostFeedbackCorrect = false;
        this.socialPostStep++;
        if (this.socialPostStep >= 3) {
          this.recordPuzzleScore('Social Media Post', this.socialPostTotalWrong, this.socialPostWasRevealed);
          this.currentState = GameState.SocialPostDone;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.postReviewed'), id: 'system_postReviewed' });
        }
      }, 1500);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.socialPostWrongAttempts++;
      this.socialPostTotalWrong++;

      if (this.socialPostStep === 0) {
        this.socialPostFeedback = this.t('puzzles.socialPost.captionFeedbackWrong');
      } else if (this.socialPostStep === 1) {
        this.socialPostFeedback = this.t('puzzles.socialPost.imageFeedbackWrong');
      } else {
        this.socialPostFeedback = this.t('puzzles.socialPost.hashtagFeedbackWrong');
      }
      this.socialPostFeedbackCorrect = false;

      if (this.socialPostWrongAttempts >= 3) {
        this.socialPostWasRevealed = true;
        this.answerOverlayText = this.t('puzzles.socialPost.answerOverlay');
        this.answerOverlayCallback = () => {
          this.socialPostWrongAttempts = 0;
          this.socialPostStep = 3;
          this.recordPuzzleScore('Social Media Post', this.socialPostTotalWrong, true);
          this.currentState = GameState.SocialPostDone;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.postReviewed'), id: 'system_postReviewed' });
        };
        this.showAnswerOverlay = true;
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // ══════════════════════════════════════
  //  PUZZLE 4: Comments
  // ══════════════════════════════════════

  moderateComment(action: 'reply' | 'delete'): void {
    const correct = this.t('puzzles.comments.comments.' + this.commentIndex + '.correct');
    if (action === correct) {
      this.playSound('success-chime.wav');
      this.commentFeedback = this.t('puzzles.comments.comments.' + this.commentIndex + '.feedbackCorrect');
      this.commentFeedbackCorrect = true;
      this.commentWrongAttempts = 0;

      setTimeout(() => {
        this.commentFeedback = '';
        this.commentFeedbackCorrect = false;
        this.commentIndex++;
        if (this.commentIndex >= this.commentCount) {
          this.recordPuzzleScore('Comment Moderation', this.commentTotalWrong, this.commentWasRevealed);
          this.currentState = GameState.CommentsDone;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.commentsComplete'), id: 'system_commentsComplete' });
        }
      }, 1500);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.commentWrongAttempts++;
      this.commentTotalWrong++;
      this.commentFeedback = this.t('puzzles.comments.comments.' + this.commentIndex + '.feedbackWrong');
      this.commentFeedbackCorrect = false;

      if (this.commentWrongAttempts >= 3) {
        this.commentWasRevealed = true;
        this.answerOverlayText = this.t('puzzles.comments.answerOverlay');
        this.answerOverlayCallback = () => {
          this.commentWrongAttempts = 0;
          this.commentIndex = this.commentCount;
          this.recordPuzzleScore('Comment Moderation', this.commentTotalWrong, true);
          this.currentState = GameState.CommentsDone;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.commentsComplete'), id: 'system_commentsComplete' });
        };
        this.showAnswerOverlay = true;
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // ══════════════════════════════════════
  //  Mini Puzzle: Sticky Note
  // ══════════════════════════════════════

  handleStickyNote(choice: 'yes' | 'no'): void {
    if (choice === 'yes') {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.stickyNote.feedbackCorrect'), id: 'system_stickyNoteShredded' });
    } else {
      this.playSound('error-buzz.mp3');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.stickyNote.feedbackWrong'), id: 'system_stickyNoteKept' });
    }
  }

  // ══════════════════════════════════════
  //  Mini Puzzle: USB
  // ══════════════════════════════════════

  handleUSB(choice: 'plugin' | 'leave'): void {
    if (choice === 'leave') {
      this.playSound('success-chime.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.usb.feedbackCorrect'), id: 'system_usbIgnored' });
    } else {
      this.playSound('error-buzz.mp3');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.usb.feedbackWrong'), id: 'system_usbPluggedIn' });
    }
  }

  // ══════════════════════════════════════
  //  Mini Puzzle: Ad
  // ══════════════════════════════════════

  handleAd(choice: 'click' | 'close'): void {
    if (choice === 'close') {
      this.playSound('success-chime.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.ad.feedbackCorrect'), id: 'system_adClosed' });
    } else {
      this.playSound('error-buzz.mp3');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.ad.feedbackWrong'), id: 'system_adClicked' });
    }
  }

  // ══════════════════════════════════════
  //  Mini Puzzle: System Update
  // ══════════════════════════════════════

  handleSystemUpdate(choice: 'install' | 'postpone'): void {
    if (choice === 'install') {
      this.playSound('success-chime.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.systemUpdate.feedbackCorrect'), id: 'system_updateInstalled' });
    } else {
      this.playSound('error-buzz.mp3');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.systemUpdate.feedbackWrong'), id: 'system_updatePostponed' });
    }
  }

  // ══════════════════════════════════════
  //  Mini Puzzle: WiFi
  // ══════════════════════════════════════

  handleWifi(choice: 'free' | 'company'): void {
    if (choice === 'company') {
      this.playSound('success-chime.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.wifi.feedbackCorrect'), id: 'system_wifiCompany' });
    } else {
      this.playSound('error-buzz.mp3');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.wifi.feedbackWrong'), id: 'system_wifiFree' });
    }
  }

  // ══════════════════════════════════════
  //  Malware Recovery (Call IT)
  // ══════════════════════════════════════

  callITForHelp(): void {
    this.playSound('success-chime.wav');
    this.isMalwareInfected = false;
    // Determine which mini puzzle caused the infection and provide recovery dialogue
    if (this.currentState === GameState.MiniUSB) {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.malwareRecovery'), id: 'system_malwareRecovery_usb' });
    } else if (this.currentState === GameState.MiniAd) {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.malwareRecovery'), id: 'system_malwareRecovery_ad' });
    } else if (this.currentState === GameState.MiniUpdate) {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.malwareRecovery'), id: 'system_malwareRecovery_update' });
    } else if (this.currentState === GameState.MiniWifi) {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.malwareRecovery'), id: 'system_malwareRecovery_wifi' });
    }
  }

  // ══════════════════════════════════════
  //  Skip Puzzle Methods
  // ══════════════════════════════════════

  skipPasswordAudit(): void {
    this.recordPuzzleScore('Password Audit', 99, true);
    this.passwordFeedback = '';
    this.currentState = GameState.PasswordAuditDone;
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.passwordAudit.allCorrect'), id: 'system_passwordAuditComplete' });
  }

  skipPhishing(): void {
    this.recordPuzzleScore('Phishing Detection', 99, true);
    this.emailFeedback = '';
    this.currentState = GameState.PhishingDone;
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.phishingComplete'), id: 'system_phishingComplete' });
  }

  skipSocialPost(): void {
    this.recordPuzzleScore('Social Media Post', 99, true);
    this.socialPostFeedback = '';
    this.currentState = GameState.SocialPostDone;
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.postReviewed'), id: 'system_postReviewed' });
  }

  skipComments(): void {
    this.recordPuzzleScore('Comment Moderation', 99, true);
    this.commentFeedback = '';
    this.currentState = GameState.CommentsDone;
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.commentsComplete'), id: 'system_commentsComplete' });
  }
}

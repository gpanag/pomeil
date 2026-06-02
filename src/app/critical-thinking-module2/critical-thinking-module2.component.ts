import { Component, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { EscapeRoomBaseComponent } from '../shared/escape-room/escape-room-base.component';
import { EscapeRoomTextService } from '../shared/escape-room/escape-room-text.service';
import { fadeInOut } from '../shared/escape-room/escape-room.animations';
import { Dialogue, EscapeRoomConfig, CharacterImageMap, ESCAPE_ROOM_TIMING } from '../shared/escape-room/escape-room.interfaces';

// ── Game Phases & States ────────────────────────────────────────────
enum GameState {
  Intro,
  // Phase 1 - Conversation with Mark
  Phase1_TalkToMark,
  Phase1_Conversation,
  Phase1_MarkExits,
  // Phase 2 - Research
  Phase2_Research,
  Phase2_EmailAnalysis,
  Phase2_ReviewAnalysis,
  // Phase 3 - Decision
  Phase3_Sorting,
  Phase3_Decision,
  Completion
}

type ViewState = 'main' | 'laptop' | 'tv' | 'corkboard' | 'calendar' | 'flyer' | 'businessCard' | 'poster' | 'magazine';

const imagePaths = {
  base: '/assets/images/critical_thinking/waiting_room_default.png',
  base_door_open: '/assets/images/critical_thinking/waiting_room_door_open.png',
  mark_hover: '/assets/images/critical_thinking/mark_hover.png',
  mark_talking: '/assets/images/critical_thinking/mark_talking.png',
  mark_hover_door_open: '/assets/images/critical_thinking/mark_hover_door_open.png',
  maria_hover: '/assets/images/critical_thinking/maria_hover.png',
  maria_talking: '/assets/images/critical_thinking/maria_talking.png',
  maria_hover_door_open: '/assets/images/critical_thinking/maria_hover_door_open.png',
  zoom_laptop: '/assets/images/critical_thinking/zoom_laptop.png',
  zoom_tv: '/assets/images/critical_thinking/zoom_tv.png',
  zoom_corkboard: '/assets/images/critical_thinking/zoom_corkboard.png',
  zoom_calendar: '/assets/images/critical_thinking/zoom_calendar.png',
  zoom_flyer: '/assets/images/critical_thinking/zoom_flyer.png',
  zoom_business_card: '/assets/images/critical_thinking/zoom_business_card.png',
  zoom_poster: '/assets/images/critical_thinking/zoom_poster.png',
  zoom_magazine: '/assets/images/critical_thinking/zoom_magazine.png',
};

const roomConfig: EscapeRoomConfig = {
  roomId: 'critical-thinking',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

// ── Conversation step definition ────────────────────────────────────
interface ConversationStep {
  id: string;
  speaker: 'mark' | 'player';
  textKey: string;            // i18n path
  options?: {
    correctKey: string;       // i18n path for correct response
    wrongKey: string;         // i18n path for wrong response
    hintKey: string;          // i18n path for wrong-choice hint
  };
}

const CONVERSATION_STEPS: ConversationStep[] = [
  { id: 'conv_1', speaker: 'mark', textKey: 'characters.mark.dialogues.greet' },
  { id: 'conv_1r', speaker: 'player', textKey: 'conversation.player.response1' },
  { id: 'conv_2', speaker: 'mark', textKey: 'characters.mark.dialogues.intro' },
  { id: 'conv_2r', speaker: 'player', textKey: 'conversation.player.response2' },
  { id: 'conv_3', speaker: 'mark', textKey: 'characters.mark.dialogues.offer',
    options: {
      correctKey: 'conversation.player.response3_correct',
      wrongKey: 'conversation.player.response3_wrong',
      hintKey: 'characters.mark.dialogues.offerWrongHint'
    }
  },
  { id: 'conv_4', speaker: 'mark', textKey: 'characters.mark.dialogues.pressure',
    options: {
      correctKey: 'conversation.player.response4_correct',
      wrongKey: 'conversation.player.response4_wrong',
      hintKey: 'characters.mark.dialogues.pressureWrongHint'
    }
  },
  { id: 'conv_5', speaker: 'mark', textKey: 'characters.mark.dialogues.careful' },
  { id: 'conv_5r', speaker: 'player', textKey: 'conversation.player.response5' },
  { id: 'conv_6', speaker: 'mark', textKey: 'characters.mark.dialogues.vagueClaims',
    options: {
      correctKey: 'conversation.player.response6_correct',
      wrongKey: 'conversation.player.response6_wrong',
      hintKey: 'characters.mark.dialogues.vagueClaimsWrongHint'
    }
  },
  { id: 'conv_7', speaker: 'mark', textKey: 'characters.mark.dialogues.sendDocs' },
  { id: 'conv_7r', speaker: 'player', textKey: 'conversation.player.response7' },
  { id: 'conv_8', speaker: 'mark', textKey: 'characters.mark.dialogues.farewell',
    options: {
      correctKey: 'conversation.player.response8_correct',
      wrongKey: 'conversation.player.response8_wrong',
      hintKey: 'characters.mark.dialogues.farewellWrongHint'
    }
  },
];

// Maria conversation (linear, no branching)
const MARIA_STEPS: { id: string; textKey: string }[] = [
  { id: 'maria_1', textKey: 'characters.maria.dialogues.greet' },
  { id: 'maria_2', textKey: 'characters.maria.dialogues.warning1' },
  { id: 'maria_3', textKey: 'characters.maria.dialogues.warning2' },
  { id: 'maria_4', textKey: 'characters.maria.dialogues.warning3' },
  { id: 'maria_5', textKey: 'characters.maria.dialogues.warning4' },
  { id: 'maria_6', textKey: 'characters.maria.dialogues.warning5' },
  { id: 'maria_7', textKey: 'characters.maria.dialogues.warning6' },
  { id: 'maria_8', textKey: 'characters.maria.dialogues.warning7' },
  { id: 'maria_9', textKey: 'characters.maria.dialogues.warning8' },
  { id: 'maria_10', textKey: 'characters.maria.dialogues.completion' },
];

// Email clue keys (order shown)
const EMAIL_CLUE_KEYS = ['subject', 'discount', 'todayOnly', 'testimonials', 'terms'];

// Research note IDs grouped by source
const NOTES_FROM_CONVERSATION = ['conversation_written_offer', 'conversation_consistent', 'conversation_good_offer', 'conversation_pressure', 'conversation_vague', 'conversation_uninvited'];
const NOTES_FROM_MARIA = ['maria_bad_experience'];
const NOTES_FROM_EMAIL = ['email_urgency', 'email_discount_suspicious', 'email_generic_testimonials', 'email_hidden_terms', 'email_time_pressure'];
const NOTES_FROM_REVIEWS = ['reviews_fake', 'reviews_negative_pattern'];
const NOTES_FROM_CALENDAR = ['calendar_no_meeting'];
const NOTES_FROM_FLYER = ['flyer_lacking'];
const NOTES_FROM_CARD = ['card_unprofessional'];

const ALL_RESEARCH_NOTE_IDS = [
  ...NOTES_FROM_CONVERSATION,
  ...NOTES_FROM_MARIA,
  ...NOTES_FROM_EMAIL,
  ...NOTES_FROM_REVIEWS,
  ...NOTES_FROM_CALENDAR,
  ...NOTES_FROM_FLYER,
  ...NOTES_FROM_CARD,
];

// Total: 3 PRO + 14 CON = 17 notes

@Component({
  selector: 'app-critical-thinking-module2',
  templateUrl: './critical-thinking-module2.component.html',
  styleUrl: './critical-thinking-module2.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
  animations: [fadeInOut]
})
export class CriticalThinkingModule2Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  // TrackBy functions
  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;
  trackByKey = (_: number, item: { key: string }) => item.key;

  override get config(): EscapeRoomConfig { return roomConfig; }

  // ── Core state ─────────────────────────────────────────────────────
  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'main';

  // Hint system
  public isHintDialogue: boolean = false;

  // ── Phase 1 state ──────────────────────────────────────────────────
  conversationStepIndex: number = 0;
  isShowingOptions: boolean = false;
  wrongOptionChosen: boolean = false;
  conversationHint: string = '';
  conversationWrongCount: number = 0;
  conversationWasRevealed: boolean = false;
  markPresent: boolean = true;

  // ── Phase 2 state ──────────────────────────────────────────────────
  // Maria conversation
  mariaStepIndex: number = 0;
  mariaConversationActive: boolean = false;
  mariaDone: boolean = false;

  // Email analysis
  emailPopupVisible: boolean = false;
  emailCluesFound: string[] = [];
  emailClueThought: string = '';
  emailDone: boolean = false;

  // Review analysis
  reviewPopupVisible: boolean = false;
  currentReviewIndex: number = 0;
  reviewThoughtsShown: boolean[] = [false, false, false, false, false, false, false, false];
  reviewsDone: boolean = false;
  reviewThought: string = '';

  // Object interactions
  calendarDone: boolean = false;
  flyerDone: boolean = false;
  businessCardDone: boolean = false;
  posterSeen: boolean = false;
  magazineSeen: boolean = false;

  // Object popup state
  objectPopupVisible: boolean = false;
  objectPopupTitle: string = '';
  objectPopupContent: string = '';
  objectPopupThought: string = '';
  objectPopupType: string = '';

  // Research notes collected
  collectedNotes: string[] = [];

  // Email wrong attempts (for scoring)
  emailWrongAttempts: number = 0;
  emailWasRevealed: boolean = false;

  // Review wrong attempts (for scoring)
  reviewWrongAttempts: number = 0;
  reviewWasRevealed: boolean = false;

  // ── Phase 3 state ──────────────────────────────────────────────────
  sortedPro: string[] = [];
  sortedCon: string[] = [];
  currentSortingNoteIndex: number = 0;
  sortingWrongCount: number = 0;
  sortingWasRevealed: boolean = false;
  sortingComplete: boolean = false;
  decisionMade: boolean = false;
  decisionFeedback: string = '';
  decisionChoice: string = '';

  // ── Hotspots ──────────────────────────────────────────────────────
  hotspots = {
    main: {
      mark:         { x: 26, y: 44, width: 22, height: 48 },
      maria:        { x: 76, y: 33, width: 10, height: 30 },
      laptop:       { x: 54, y: 56, width: 12, height: 14 },
      tv:           { x: 18, y: 36, width: 12, height: 14 },
      corkboard: { x: 57, y: 30, width: 19, height: 19 },
      calendar:     { x: 14, y: 28, width: 8, height: 14 },
      flyer: { x: 60, y: 87, width: 12, height: 9 },
      businessCard: { x: 56, y: 62, width: 8, height: 6 },
      poster: { x: 51, y: 37, width: 5, height: 11 },
      magazine: { x: 43, y: 50, width: 6, height: 14 },
      exitDoor: { x: 0, y: 33, width: 10, height: 33 },
    },
    laptop_zoom:       { content: { x: 15, y: 15, width: 70, height: 70 } },
    tv_zoom:           { content: { x: 15, y: 15, width: 70, height: 70 } },
    corkboard_zoom:    { content: { x: 15, y: 15, width: 70, height: 70 } },
    calendar_zoom:     { content: { x: 15, y: 15, width: 70, height: 70 } },
    flyer_zoom:        { content: { x: 15, y: 15, width: 70, height: 70 } },
    businessCard_zoom: { content: { x: 15, y: 15, width: 70, height: 70 } },
    poster_zoom:       { content: { x: 15, y: 15, width: 70, height: 70 } },
    magazine_zoom:     { content: { x: 15, y: 15, width: 70, height: 70 } },
  };

  // ── Character images ──────────────────────────────────────────────
  override get characterImages(): CharacterImageMap {
    return {
      mark: { hover: imagePaths.mark_hover, hoverDoorOpen: imagePaths.mark_hover_door_open },
      maria: { hover: imagePaths.maria_hover, hoverDoorOpen: imagePaths.maria_hover_door_open },
    };
  }

  protected override canInteractWithCharacter(): boolean {
    return this.currentView === 'main' && !this.activeDialogue && !this.isAnimating;
  }

  public override get isMainViewActive(): boolean {
    return this.currentView === 'main';
  }

  public override get isQuizActive(): boolean {
    return this.emailPopupVisible || this.reviewPopupVisible || this.objectPopupVisible ||
           this.currentState === GameState.Phase3_Sorting || this.currentState === GameState.Phase3_Decision;
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

  // ── Background ─────────────────────────────────────────────────────
  override updateBackground(): void {
    if (this.activeDialogue) return;

    if (this.isDoorOpen) {
      this.currentBackgroundUrl = imagePaths.base_door_open;
      return;
    }

    switch (this.currentView) {
      case 'laptop': this.currentBackgroundUrl = imagePaths.zoom_laptop; break;
      case 'tv': this.currentBackgroundUrl = imagePaths.zoom_tv; break;
      case 'corkboard': this.currentBackgroundUrl = imagePaths.zoom_corkboard; break;
      case 'calendar': this.currentBackgroundUrl = imagePaths.zoom_calendar; break;
      case 'flyer': this.currentBackgroundUrl = imagePaths.zoom_flyer; break;
      case 'businessCard': this.currentBackgroundUrl = imagePaths.zoom_business_card; break;
      case 'poster': this.currentBackgroundUrl = imagePaths.zoom_poster; break;
      case 'magazine': this.currentBackgroundUrl = imagePaths.zoom_magazine; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  // ── Hints ──────────────────────────────────────────────────────────
  protected override onHintRequested(): void {
    this.isHintDialogue = true;
  }

  protected override getHintText(): string {
    if (this.currentState === GameState.Phase1_TalkToMark || this.currentState === GameState.Phase1_Conversation) {
      return this.t('hints.phase1_talkToMark');
    }
    if (this.currentState === GameState.Phase2_Research || this.currentState === GameState.Phase2_EmailAnalysis || this.currentState === GameState.Phase2_ReviewAnalysis) {
      if (!this.mariaDone) return this.t('hints.phase2_talkToMaria');
      if (!this.emailDone) return this.t('hints.phase2_checkLaptop');
      if (!this.reviewsDone) return this.t('hints.phase2_checkTV');
      if (!this.calendarDone) return this.t('hints.phase2_checkCalendar');
      if (!this.flyerDone) return this.t('hints.phase2_checkFlyer');
      if (!this.businessCardDone) return this.t('hints.phase2_checkCard');
      if (!this.posterSeen) return this.t('hints.phase2_checkPoster');
      if (!this.magazineSeen) return this.t('hints.phase2_checkMagazine');
      return this.t('hints.phase2_goCorkboard');
    }
    if (this.currentState === GameState.Phase3_Sorting) {
      return this.sortingComplete ? this.t('hints.phase3_decision') : this.t('hints.phase3_sorting');
    }
    if (this.currentState === GameState.Phase3_Decision) {
      return this.t('hints.phase3_decision');
    }
    if (this.currentState === GameState.Completion) {
      return this.t('hints.completion');
    }
    return this.t('hints.default');
  }

  // ── Hotspot clicks ─────────────────────────────────────────────────
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

    // Mark interaction
    if (target === 'mark' && this.markPresent) {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.mark_talking;
      this.handleMarkInteraction();
      return;
    }

    // Maria interaction
    if (target === 'maria') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.maria_talking;
      this.handleMariaInteraction();
      return;
    }

    // Phase 2 objects (only available after Mark exits)
    if (this.currentState >= GameState.Phase2_Research && this.currentView === 'main') {
      if (target === 'laptop' && !this.emailDone) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'laptop';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }

      if (target === 'tv' && !this.reviewsDone) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'tv';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }

      if (target === 'calendar' && !this.calendarDone) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'calendar';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }

      if (target === 'flyer' && !this.flyerDone) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'flyer';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }

      if (target === 'businessCard' && !this.businessCardDone) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'businessCard';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }

      if (target === 'poster' && !this.posterSeen) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'poster';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }

      if (target === 'magazine' && !this.magazineSeen) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'magazine';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }

      // Corkboard - only when all mandatory research is done
      if (target === 'corkboard' && this.isAllResearchDone()) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'corkboard';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }
    }

    // --- Clicks within zoomed views ---
    if (this.currentView === 'laptop' && target === 'laptopContent' && !this.emailDone) {
      this.playSound('paper-rustle.wav');
      this.emailPopupVisible = true;
      this.emailClueThought = '';
      return;
    }
    if (this.currentView === 'tv' && target === 'tvContent' && !this.reviewsDone) {
      this.playSound('paper-rustle.wav');
      this.reviewPopupVisible = true;
      this.currentReviewIndex = 0;
      this.reviewThought = '';
      return;
    }
    if (this.currentView === 'calendar' && target === 'calendarContent' && !this.calendarDone) {
      this.playSound('paper-rustle.wav');
      this.showObjectPopup('calendar');
      return;
    }
    if (this.currentView === 'flyer' && target === 'flyerContent' && !this.flyerDone) {
      this.playSound('paper-rustle.wav');
      this.showObjectPopup('flyer');
      return;
    }
    if (this.currentView === 'businessCard' && target === 'businessCardContent' && !this.businessCardDone) {
      this.playSound('paper-rustle.wav');
      this.showObjectPopup('businessCard');
      return;
    }
    if (this.currentView === 'poster' && target === 'posterContent' && !this.posterSeen) {
      this.playSound('paper-rustle.wav');
      this.showObjectPopup('poster');
      return;
    }
    if (this.currentView === 'magazine' && target === 'magazineContent' && !this.magazineSeen) {
      this.playSound('paper-rustle.wav');
      this.showObjectPopup('magazine');
      return;
    }
    if (this.currentView === 'corkboard' && target === 'corkboardContent' && this.isAllResearchDone()) {
      this.playSound('paper-rustle.wav');
      this.currentState = GameState.Phase3_Sorting;
      this.currentSortingNoteIndex = 0;
      return;
    }
  }

  // ── Mark interaction (Phase 1) ─────────────────────────────────────
  handleMarkInteraction(): void {
    if (this.currentState === GameState.Phase1_TalkToMark) {
      this.currentState = GameState.Phase1_Conversation;
      this.conversationStepIndex = 0;
      this.advanceConversation();
    } else if (this.currentState === GameState.Phase1_Conversation) {
      this.advanceConversation();
    } else {
      const markName = this.t('characters.mark.name');
      this.showDialogue({ character: markName, text: this.t('characters.mark.dialogues.default'), id: 'mark_default' });
    }
  }

  advanceConversation(): void {
    if (this.conversationStepIndex >= CONVERSATION_STEPS.length) {
      // Conversation complete - Mark exits
      this.markPresent = false;
      this.addNotes(NOTES_FROM_CONVERSATION);
      this.recordPuzzleScore('Conversation', this.conversationWrongCount, this.conversationWasRevealed);
      this.currentState = GameState.Phase1_MarkExits;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.markExits'), id: 'system_markExits' });
      return;
    }

    const step = CONVERSATION_STEPS[this.conversationStepIndex];

    if (step.speaker === 'mark') {
      const markName = this.t('characters.mark.name');
      this.showDialogue({ character: markName, text: this.t(step.textKey), id: step.id });
      if (step.options) {
        this.isShowingOptions = true;
        this.wrongOptionChosen = false;
        this.conversationHint = '';
      }
    } else {
      // Player line - auto-advance through it as dialogue
      this.showDialogue({ character: this.playerSpeaker, text: this.t(step.textKey), id: step.id });
    }
  }

  onConversationChoice(isCorrect: boolean): void {
    const step = CONVERSATION_STEPS[this.conversationStepIndex];
    if (!step.options) return;

    if (isCorrect) {
      this.playSound('success-chime.wav');
      this.isShowingOptions = false;
      this.wrongOptionChosen = false;
      this.conversationHint = '';
      // Show player's correct response as dialogue
      this.showDialogue({ character: this.playerSpeaker, text: this.t(step.options.correctKey), id: step.id + '_response' });
    } else {
      this.playSound('error-buzz.mp3');
      this.conversationWrongCount++;
      this.wrongOptionChosen = true;
      this.conversationHint = this.t(step.options.hintKey);
      // Wrong option disappears, player must pick correct one
    }
  }

  // ── Maria interaction (Phase 2) ────────────────────────────────────
  handleMariaInteraction(): void {
    if (this.mariaDone) {
      const mariaName = this.t('characters.maria.name');
      this.showDialogue({ character: mariaName, text: this.t('characters.maria.dialogues.default'), id: 'maria_default' });
      return;
    }

    if (this.currentState < GameState.Phase2_Research) {
      const mariaName = this.t('characters.maria.name');
      this.showDialogue({ character: mariaName, text: this.t('characters.maria.dialogues.default'), id: 'maria_default' });
      return;
    }

    if (!this.mariaConversationActive) {
      this.mariaConversationActive = true;
      this.mariaStepIndex = 0;
    }

    this.advanceMaria();
  }

  advanceMaria(): void {
    if (this.mariaStepIndex >= MARIA_STEPS.length) {
      this.mariaDone = true;
      this.mariaConversationActive = false;
      this.addNotes(NOTES_FROM_MARIA);
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.mariaNoteDone'), id: 'system_mariaNoteDone' });
      this.checkAllResearchDone();
      return;
    }

    const step = MARIA_STEPS[this.mariaStepIndex];
    const mariaName = this.t('characters.maria.name');
    this.showDialogue({ character: mariaName, text: this.t(step.textKey), id: step.id });
  }

  // ── Email analysis (Phase 2b) ─────────────────────────────────────
  onEmailClueClick(clueKey: string): void {
    if (this.emailCluesFound.includes(clueKey)) return;
    this.emailCluesFound.push(clueKey);
    this.emailClueThought = this.t('email.clues.' + clueKey + '.thought');
    this.playSound('paper-rustle.wav');
  }

  closeEmailThought(): void {
    this.emailClueThought = '';
    if (this.emailCluesFound.length >= EMAIL_CLUE_KEYS.length && !this.emailDone) {
      this.emailDone = true;
      this.addNotes(NOTES_FROM_EMAIL);
      this.recordPuzzleScore('Email Analysis', this.emailWrongAttempts, this.emailWasRevealed);
      this.emailPopupVisible = false;
      this.goBack();
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.emailAnalysisDone'), id: 'system_emailAnalysisDone' });
      this.checkAllResearchDone();
    }
  }

  closeEmailPopup(): void {
    this.emailPopupVisible = false;
    this.emailClueThought = '';
    this.goBack();
  }

  // ── Review analysis (Phase 2c) ────────────────────────────────────
  nextReview(): void {
    if (this.currentReviewIndex < 7) {
      this.currentReviewIndex++;
      this.reviewThought = '';
    }
  }

  previousReview(): void {
    if (this.currentReviewIndex > 0) {
      this.currentReviewIndex--;
      this.reviewThought = '';
    }
  }

  showReviewThought(): void {
    this.reviewThoughtsShown[this.currentReviewIndex] = true;
  }

  closeReviewPopup(): void {
    // Check if player has seen all reviews
    const allSeen = this.currentReviewIndex >= 7;
    if (allSeen && !this.reviewsDone) {
      this.reviewsDone = true;
      this.addNotes(NOTES_FROM_REVIEWS);
      this.recordPuzzleScore('Review Analysis', this.reviewWrongAttempts, this.reviewWasRevealed);
      this.reviewPopupVisible = false;
      this.goBack();
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.reviewAnalysisDone'), id: 'system_reviewAnalysisDone' });
      this.checkAllResearchDone();
    } else if (!allSeen) {
      // Just close without marking done - player needs to see all
      this.reviewPopupVisible = false;
      this.goBack();
    } else {
      this.reviewPopupVisible = false;
      this.goBack();
    }
  }

  // ── Object interactions (Phase 2d) ─────────────────────────────────
  showObjectPopup(objectType: string): void {
    this.objectPopupType = objectType;
    this.objectPopupTitle = this.t('objects.' + objectType + '.title');
    this.objectPopupContent = this.t('objects.' + objectType + '.content');
    this.objectPopupThought = this.t('objects.' + objectType + '.thought');
    this.objectPopupVisible = true;
  }

  closeObjectPopup(): void {
    const type = this.objectPopupType;
    this.objectPopupVisible = false;

    if (type === 'calendar' && !this.calendarDone) {
      this.calendarDone = true;
      this.addNotes(NOTES_FROM_CALENDAR);
      this.checkAllResearchDone();
    } else if (type === 'flyer' && !this.flyerDone) {
      this.flyerDone = true;
      this.addNotes(NOTES_FROM_FLYER);
      this.checkAllResearchDone();
    } else if (type === 'businessCard' && !this.businessCardDone) {
      this.businessCardDone = true;
      this.addNotes(NOTES_FROM_CARD);
      this.checkAllResearchDone();
    } else if (type === 'poster') {
      this.posterSeen = true;
    } else if (type === 'magazine') {
      this.magazineSeen = true;
    }

    this.goBack();
  }

  // ── Research tracking ──────────────────────────────────────────────
  addNotes(noteIds: string[]): void {
    for (const id of noteIds) {
      if (!this.collectedNotes.includes(id)) {
        this.collectedNotes.push(id);
      }
    }
  }

  isAllResearchDone(): boolean {
    return this.mariaDone && this.emailDone && this.reviewsDone &&
           this.calendarDone && this.flyerDone && this.businessCardDone;
  }

  checkAllResearchDone(): void {
    if (this.isAllResearchDone()) {
      // Show system message about going to corkboard
      setTimeout(() => {
        if (!this.activeDialogue) {
          this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allResearchDone'), id: 'system_allResearchDone' });
        }
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }
  }

  // ── Phase 3: Sorting ──────────────────────────────────────────────
  get unsortedNotes(): { id: string; text: string; correctCategory: string }[] {
    return this.collectedNotes
      .filter(noteId => !this.sortedPro.includes(noteId) && !this.sortedCon.includes(noteId))
      .map(noteId => ({
        id: noteId,
        text: this.t('researchNotes.notes.' + noteId + '.text'),
        correctCategory: this.t('researchNotes.notes.' + noteId + '.correctCategory')
      }));
  }

  get currentSortingNote(): { id: string; text: string; correctCategory: string } | null {
    const unsorted = this.unsortedNotes;
    if (unsorted.length === 0) return null;
    return unsorted[0];
  }

  sortNote(category: 'PRO' | 'CON'): void {
    const note = this.currentSortingNote;
    if (!note) return;

    if (note.correctCategory === category) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.isPuzzleWrong = false;
      if (category === 'PRO') {
        this.sortedPro.push(note.id);
      } else {
        this.sortedCon.push(note.id);
      }

      // Check if all sorted
      if (this.unsortedNotes.length === 0) {
        this.sortingComplete = true;
        this.recordPuzzleScore('Decision Making', this.sortingWrongCount, this.sortingWasRevealed);
        this.currentState = GameState.Phase3_Decision;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.sortingComplete'), id: 'system_sortingComplete' });
      }
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.sortingWrongCount++;
      this.puzzleFeedback = this.t('researchNotes.wrongPlacementHint');
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // ── Phase 3: Decision ──────────────────────────────────────────────
  makeDecision(choice: 'accept' | 'reject'): void {
    this.decisionChoice = choice;
    this.decisionMade = true;
    this.playSound('success-chime.wav');

    if (choice === 'accept') {
      this.decisionFeedback = this.t('decision.acceptFeedback');
    } else {
      this.decisionFeedback = this.t('decision.rejectFeedback');
    }
  }

  completeGame(): void {
    this.currentState = GameState.Completion;
    this.isDoorOpen = true;
    this.playDoorSound();
    this.currentView = 'main';
    this.updateBackground();
  }

  /** Skip the current phase/puzzle — every other escape room offers this, so a
   *  stuck player can always advance. State-aware: advances one phase per call,
   *  and completes the room from the final decision. */
  skipPuzzle(): void {
    this.activeDialogue = null;
    this.isShowingOptions = false;
    this.currentView = 'main';
    const s = this.currentState;
    if (s < GameState.Phase2_Research) {           // skip Phase 1 (Mark conversation)
      this.markPresent = false;
      this.currentState = GameState.Phase2_Research;
    } else if (s < GameState.Phase3_Sorting) {     // skip Phase 2 (research / email analysis)
      this.mariaDone = true;
      this.currentState = GameState.Phase3_Sorting;
      this.currentSortingNoteIndex = 0;
    } else if (s === GameState.Phase3_Sorting) {   // skip the sorting puzzle
      this.sortingComplete = true;
      this.currentState = GameState.Phase3_Decision;
    } else if (s === GameState.Phase3_Decision) {  // skip the final decision → finish
      this.completeGame();
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
    }
    this.updateBackground();
  }

  // ── Dialogue dismissal (ID-based) ─────────────────────────────────
  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;
    this.updateBackground();

    if (this.isHintDialogue) {
      this.isHintDialogue = false;
      this.showHintPulse();
      return;
    }

    this.showHints = false;

    // Intro self-talk -> Phase1
    if (id === 'system_intro') {
      this.currentState = GameState.Phase1_TalkToMark;
      return;
    }

    // Mark conversation step dismissed -> advance
    if (id && id.startsWith('conv_')) {
      // If this was a mark line with options, don't auto advance (options UI handles it)
      const stepIdx = CONVERSATION_STEPS.findIndex(s => s.id === id);
      if (stepIdx >= 0) {
        const step = CONVERSATION_STEPS[stepIdx];
        if (step.options && !id.endsWith('_response')) {
          // Mark's line with options - show option UI (handled in template)
          this.isShowingOptions = true;
          return;
        }
      }
      // Advance to next step
      this.conversationStepIndex++;
      this.advanceConversation();
      return;
    }

    // Maria conversation
    if (id && id.startsWith('maria_')) {
      this.mariaStepIndex++;
      this.advanceMaria();
      return;
    }

    // Mark exits -> Phase 2
    if (id === 'system_markExits') {
      this.currentState = GameState.Phase2_Research;
      return;
    }

    // Research done messages
    if (id === 'system_mariaNoteDone' || id === 'system_emailAnalysisDone' || id === 'system_reviewAnalysisDone') {
      // Continue research
      return;
    }

    // All research done
    if (id === 'system_allResearchDone') {
      // Player should click corkboard
      return;
    }

    // Sorting complete
    if (id === 'system_sortingComplete') {
      // Decision UI appears
      return;
    }

    // Game complete system message
    if (id === 'system_gameComplete') {
      return;
    }

    // Default dismissals
    if (id === 'mark_default' || id === 'maria_default') {
      return;
    }
  }

  /** Template-facing alias */
  handleDialogueDismiss(): void {
    this.dismissDialogue();
  }

  // ── Intro popup closed ─────────────────────────────────────────────
  protected override onIntroPopupClosed(): void {
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.intro'), id: 'system_intro' });
  }

  // ── UI helpers ─────────────────────────────────────────────────────
  protected override resetZoomState(): void {
    this.currentView = 'main';
  }

  get phase2HotspotsActive(): boolean {
    return this.currentState >= GameState.Phase2_Research && this.currentState < GameState.Phase3_Sorting;
  }

  get notesCount(): number {
    return this.collectedNotes.length;
  }

  get totalNotesCount(): number {
    return ALL_RESEARCH_NOTE_IDS.length;
  }

  get currentConversationStep(): ConversationStep | null {
    if (this.conversationStepIndex < CONVERSATION_STEPS.length) {
      return CONVERSATION_STEPS[this.conversationStepIndex];
    }
    return null;
  }

  get emailClueKeys(): string[] {
    return EMAIL_CLUE_KEYS;
  }

  /** Clamp to a safe 0–5 integer so a bad/NaN rating can never throw
   *  `Array(<invalid>)` (RangeError) and break the review's stars + text. */
  getReviewRatingStars(rating: number): number[] {
    const n = Number.isFinite(rating) ? Math.max(0, Math.min(5, Math.round(rating))) : 0;
    return Array(n).fill(0);
  }

  getReviewEmptyStars(rating: number): number[] {
    const n = Number.isFinite(rating) ? Math.max(0, Math.min(5, Math.round(rating))) : 0;
    return Array(5 - n).fill(0);
  }
}

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

enum GameState {
  Intro,
  ClickKevin,
  KevinGreeting,
  RelocateToCalm,
  FindDocument,
  DocumentFound,
  Puzzle1_SingleChoice,
  PhoneCallIntro,
  PhoneCall,
  FindLaptop,
  Puzzle2_Matching,
  Puzzle2_Complete,
  AhmedCalls,
  PCScreen,
  Puzzle3_FillGap,
  Completion
}

const imagePaths = {
  base: '/assets/images/stress_management/panic_room.png',
  base_door_open: '/assets/images/stress_management/panic_room_door_open.png',

  kevin_hover: '/assets/images/stress_management/kevin_hover.png',
  kevin_talking: '/assets/images/stress_management/kevin_talking.png',
  kevin_hover_door_open: '/assets/images/stress_management/kevin_hover_door_open.png',
  ahmed_hover: '/assets/images/stress_management/ahmed_hover.png',
  ahmed_talking: '/assets/images/stress_management/ahmed_talking.png',
  ahmed_hover_door_open: '/assets/images/stress_management/ahmed_hover_door_open.png',

  calm_corner: '/assets/images/stress_management/calm_corner.png',
  zoom_documents: '/assets/images/stress_management/zoom_documents.png',
  // The original zoom_laptop.png was never produced; we reuse Kevin-at-laptop
  // here so the screen actually loads (MMC Mavis feedback, 2026-05-09).
  zoom_laptop: '/assets/images/stress_management/kevin_typing_laptop.png',
  kevin_looking_phone: '/assets/images/stress_management/kevin_looking_phone.png',
  kevin_typing_laptop: '/assets/images/stress_management/kevin_typing_laptop.png',
  /* Mid-game relief beat shown after the player defuses the calling-client
     situation but before the laptop puzzle starts — Kevin looks calm and
     relieved/proud, signalling his stress dropped a notch. Partner ask from
     2026-05-09 (MMC Mavis); produced via methodology Step 5 (crop_enhance
     from panic_room.png Kevin region). */
  kevin_calm: '/assets/images/stress_management/kevin_calm.png',
  zoom_phone: '/assets/images/stress_management/zoom_phone.png',
  zoom_pc_screen: '/assets/images/stress_management/zoom_pc_screen.png',

  document: '/assets/images/stress_management/stress_relief_document.png',
};

type ViewState = 'main' | 'calmCorner' | 'documents' | 'laptop' | 'phone' | 'pcScreen';

const roomConfig: EscapeRoomConfig = {
  roomId: 'stress-management',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 1.5,
  preloadDoorSound: true,
};

@Component({
  selector: 'app-stress-management-skill17',
  templateUrl: './stress-management-skill17.component.html',
  styleUrl: './stress-management-skill17.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
  animations: [fadeInOut]
})
export class StressManagementSkill17Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'main';

  // Hint system (room-specific flag)
  public isHintDialogue: boolean = false;

  // Room-specific state
  isDocumentVisible: boolean = false;
  hasFoundDocument: boolean = false;

  /** Puzzle 3 "hacking countdown" timer. Ahmed's dialogue mentions a visible
   *  timer ("…some kind of task and A TIMER…") so the UI should actually
   *  show one (MMC Mavis feedback, 2026-05-09). The timer is decorative —
   *  hitting 00:00 doesn't fail the puzzle, it just freezes the display so
   *  there's no penalty for thoughtful answers. */
  public puzzle3SecondsLeft: number = 90;
  private puzzle3TimerHandle: ReturnType<typeof setInterval> | null = null;

  hotspots = {
    main: {
      // Calibrated for the full panic_room.png scene (Ahmed left, Kevin right).
      // Used as the default for every state EXCEPT FindLaptop, which now shows
      // a Kevin-focused close-up (kevin_calm.png) with a different layout —
      // see findLaptop_main below and the *KevinHotspot / *LaptopHotspot
      // getters used by the template.
      kevin: { x: 60, y: 45, width: 12, height: 30 },
      ahmed: { x: 25, y: 45, width: 10, height: 35 },
      calmCorner: { x: 5, y: 40, width: 30, height: 45 },
      documents: { x: 73, y: 0, width: 20, height: 20 },
      laptop: { x: 25, y: 70, width: 20, height: 20 },
      phone: { x: 25, y: 75, width: 15, height: 20 },
      pcScreen: { x: 10, y: 40, width: 25, height: 30 },
      exitDoor: { x: 35, y: 30, width: 12, height: 40 },
    },
    /* FindLaptop main view shows kevin_calm.png (1584×1056, Kevin centered,
       laptop on the small table in front). Positions from YOLO11x detection
       on the actual asset: person 29-80% x / 0-99% y; laptop 22-53% x /
       67-95% y. Pre-existing main hotspots were calibrated for
       panic_room.png and so misaligned with this close-up. */
    findLaptop_main: {
      kevin: { x: 29, y: 5, width: 50, height: 90 },
      laptop: { x: 22, y: 67, width: 31, height: 28 },
    },
    laptop_zoom: {
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    phone_zoom: {
      content: { x: 15, y: 15, width: 70, height: 70 },
    }
  };

  /** Kevin clickable rect for the current state. FindLaptop swaps to a
   *  layout calibrated for kevin_calm.png; everything else uses the
   *  panic_room layout. */
  get mainKevinHotspot() {
    return this.currentState === GameState.FindLaptop
      ? this.hotspots.findLaptop_main.kevin
      : this.hotspots.main.kevin;
  }

  /** Laptop clickable rect for the current state — see mainKevinHotspot. */
  get mainLaptopHotspot() {
    return this.currentState === GameState.FindLaptop
      ? this.hotspots.findLaptop_main.laptop
      : this.hotspots.main.laptop;
  }

  // TrackBy functions for *ngFor with getter-backed data
  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;

  // Puzzle 1: Single Choice
  get puzzle1Options() {
    return [
      { id: 'a', text: this.t('puzzles.singleChoice.options.0.text'), correct: false },
      { id: 'b', text: this.t('puzzles.singleChoice.options.1.text'), correct: false },
      { id: 'c', text: this.t('puzzles.singleChoice.options.2.text'), correct: false },
      { id: 'd', text: this.t('puzzles.singleChoice.options.3.text'), correct: true }
    ];
  }
  puzzle1WrongAttempts = { count: 0 };
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;

  // Puzzle 2: Sentence Matching (6 pairs)
  get matchingPairs() {
    return [
      { id: '1', beginning: this.t('puzzles.matching.pairs.0.beginning'), endingId: 'D' },
      { id: '2', beginning: this.t('puzzles.matching.pairs.1.beginning'), endingId: 'F' },
      { id: '3', beginning: this.t('puzzles.matching.pairs.2.beginning'), endingId: 'C' },
      { id: '4', beginning: this.t('puzzles.matching.pairs.3.beginning'), endingId: 'B' },
      { id: '5', beginning: this.t('puzzles.matching.pairs.4.beginning'), endingId: 'A' },
      { id: '6', beginning: this.t('puzzles.matching.pairs.5.beginning'), endingId: 'E' }
    ];
  }
  get matchingOptions() {
    return [
      { id: 'A', text: this.t('puzzles.matching.options.0.text') },
      { id: 'B', text: this.t('puzzles.matching.options.1.text') },
      { id: 'C', text: this.t('puzzles.matching.options.2.text') },
      { id: 'D', text: this.t('puzzles.matching.options.3.text') },
      { id: 'E', text: this.t('puzzles.matching.options.4.text') },
      { id: 'F', text: this.t('puzzles.matching.options.5.text') }
    ];
  }
  selectedCueId: string | null = null;
  solvedMatches: string[] = [];
  matchingWrongAttempts = { count: 0 };
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;

  // Puzzle 3: Fill-in-the-gaps (5 blanks)
  get gapSentenceParts() {
    return [
      this.t('puzzles.fillGap.sentenceParts.0'),
      this.t('puzzles.fillGap.sentenceParts.1'),
      this.t('puzzles.fillGap.sentenceParts.2'),
      this.t('puzzles.fillGap.sentenceParts.3'),
      this.t('puzzles.fillGap.sentenceParts.4'),
      this.t('puzzles.fillGap.sentenceParts.5')
    ];
  }
  get gapOptions() {
    return [
      this.t('puzzles.fillGap.options.0'),
      this.t('puzzles.fillGap.options.1'),
      this.t('puzzles.fillGap.options.2'),
      this.t('puzzles.fillGap.options.3'),
      this.t('puzzles.fillGap.options.4'),
      this.t('puzzles.fillGap.options.5')
    ];
  }
  userGapAnswers: (string | null)[] = [null, null, null, null, null];
  gapWrongAttempts = { count: 0 };
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  // Wrong document clicks
  wrongDocClicks: number = 0;

  constructor(
    @Inject(DOCUMENT) document: Document,
    router: Router,
    dialog: MatDialog,
    textService: EscapeRoomTextService
  ) {
    super(document, router, dialog, textService);
    this.currentBackgroundUrl = imagePaths.base;
  }

  // --- Abstract implementations ---

  override get characterImages(): CharacterImageMap {
    return {
      kevin: { hover: imagePaths.kevin_hover, hoverDoorOpen: imagePaths.kevin_hover_door_open },
      ahmed: { hover: imagePaths.ahmed_hover, hoverDoorOpen: imagePaths.ahmed_hover_door_open },
    };
  }

  protected override canInteractWithCharacter(): boolean {
    return this.currentView === 'main' && !this.activeDialogue && this.currentState !== GameState.PCScreen && !this.isAnimating;
  }

  override get isMainViewActive(): boolean {
    return this.currentView === 'main';
  }

  override get isQuizActive(): boolean {
    return this.currentState === GameState.Puzzle1_SingleChoice ||
           this.currentState === GameState.Puzzle2_Matching ||
           this.currentState === GameState.Puzzle3_FillGap;
  }

  protected override onInit(): void {
    this.preloadImages(Object.values(imagePaths));
  }

  override updateBackground(): void {
    if (this.activeDialogue) return;

    if (this.currentState === GameState.Puzzle1_SingleChoice ||
        this.currentState === GameState.Puzzle2_Matching ||
        this.currentState === GameState.Puzzle3_FillGap) {
      this.currentBackgroundUrl = imagePaths.calm_corner;
      return;
    }

    if (this.currentState === GameState.PhoneCall && this.currentView !== 'phone') {
      this.currentBackgroundUrl = imagePaths.kevin_looking_phone;
      return;
    }

    if (this.currentState === GameState.FindLaptop && this.currentView !== 'laptop') {
      // Main-view bg in FindLaptop is the calm/proud Kevin (mid-game relief
      // beat). The kevin_typing_laptop variant is what the player sees once
      // they zoom into the laptop hotspot — handled by the 'laptop' branch
      // of the currentView switch below via imagePaths.zoom_laptop.
      this.currentBackgroundUrl = imagePaths.kevin_calm;
      return;
    }

    if (this.currentState === GameState.AhmedCalls) {
      this.currentBackgroundUrl = imagePaths.ahmed_talking;
      return;
    }

    if (this.currentState === GameState.PCScreen) {
      this.currentBackgroundUrl = imagePaths.zoom_pc_screen;
      return;
    }

    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }

    switch (this.currentView) {
      case 'calmCorner': this.currentBackgroundUrl = imagePaths.calm_corner; break;
      case 'documents': this.currentBackgroundUrl = imagePaths.zoom_documents; break;
      case 'laptop': this.currentBackgroundUrl = imagePaths.zoom_laptop; break;
      case 'phone': this.currentBackgroundUrl = imagePaths.zoom_phone; break;
      case 'pcScreen': this.currentBackgroundUrl = imagePaths.zoom_pc_screen; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  override onHotspotClick(target: string): void {
    this.showHints = false;
    if (this.activeDialogue) return;

    if (target === 'exitDoor' && this.isDoorOpen && this.currentState === GameState.Completion) {
      this.playSound('success-chime.wav');
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
      return;
    }

    if (target === 'kevin') {
      this.playSound('character-click.wav');
      // After the room is solved Kevin should look relieved (door-open
      // variant) rather than the distressed talking pose used during the
      // crisis (MMC Mavis feedback, 2026-05-09).
      this.currentBackgroundUrl = this.isDoorOpen
        ? imagePaths.kevin_hover_door_open
        : imagePaths.kevin_talking;
      this.handleKevinInteraction();
      return;
    }

    if (target === 'ahmed') {
      this.playSound('character-click.wav');
      this.currentBackgroundUrl = this.isDoorOpen
        ? imagePaths.ahmed_hover_door_open
        : imagePaths.ahmed_talking;
      this.handleAhmedInteraction();
      return;
    }

    if (target === 'documents' && this.currentState === GameState.FindDocument) {
      this.zoomToLocation('documents', this.hotspots.main, () => {
        this.currentView = 'documents';
        this.updateBackground();
        this.resetZoom(true);
      }, 2.5);
      return;
    }

    if (target === 'laptop' && this.currentState === GameState.FindLaptop) {
      this.playSound('keyboard_typing.wav');
      this.zoomToLocation('laptop', this.hotspots.main, () => {
        this.currentView = 'laptop';
        this.updateBackground();
        this.resetZoom(true);
        // Player must click hotspot within zoomed view to start puzzle
      }, 2.5);
      return;
    }

    if (target === 'phone' && this.currentState === GameState.PhoneCall) {
      this.zoomToLocation('phone', this.hotspots.main, () => {
        this.currentView = 'phone';
        this.updateBackground();
        this.resetZoom(true);
        // Player must click hotspot within zoomed view to pick up phone
      }, 3.0);
      return;
    }

    // --- Click within laptop zoomed view ---
    if (this.currentView === 'laptop' && target === 'laptopContent' && this.currentState === GameState.FindLaptop) {
      this.playSound('paper-rustle.wav');
      this.currentState = GameState.Puzzle2_Matching;
      this.updateBackground();
      return;
    }

    // --- Click within phone zoomed view ---
    if (this.currentView === 'phone' && target === 'phoneContent' && this.currentState === GameState.PhoneCall) {
      this.playSound('step.wav');
      this.showDialogue({
        id: 'system_phonePickUp',
        character: this.playerSpeaker,
        text: this.t('systemDialogues.phonePickUp')
      });
      return;
    }

    if (target === 'pcScreen' && this.currentState === GameState.PCScreen) {
      this.playSound('keyboard_typing.wav');
      this.zoomToLocation('pcScreen', this.hotspots.main, () => {
        this.currentView = 'pcScreen';
        this.updateBackground();
        this.resetZoom(true);
      }, 2.5);
      return;
    }
  }

  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const text = this.activeDialogue.text;
    const character = this.activeDialogue.character;
    const id = this.activeDialogue?.id;
    this.activeDialogue = null;

    if (this.isHintDialogue) {
      this.isHintDialogue = false;
      this.showHintPulse();
      return;
    }
    this.showHints = false;

    // After self-talk, pulse Kevin's hotspot to guide the player
    if (id === 'selfTalk_enterPanicRoom') {
      this.showHints = true;
      this.showHintPulse();
      this.updateBackground();
      return;
    }

    // Intro -> ClickKevin
    if (id === 'kevin_greeting') {
      this.showDialogue({
        id: 'kevin_itUnavailable',
        character: this.t('characters.kevin.name'),
        text: this.t('characters.kevin.dialogues.itTeamUnavailable')
      });
    }
    else if (id === 'kevin_itUnavailable') {
      this.showDialogue({
        id: 'kevin_youTrembling',
        character: this.t('characters.kevin.name'),
        text: this.t('characters.kevin.dialogues.youTrembling')
      });
    }
    else if (id === 'kevin_youTrembling') {
      this.currentState = GameState.RelocateToCalm;
      this.currentView = 'calmCorner';
      this.updateBackground();
      setTimeout(() => {
        this.showDialogue({
          id: 'kevin_drinkWater',
          character: this.t('characters.kevin.name'),
          text: this.t('characters.kevin.dialogues.drinkWater')
        });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }
    else if (id === 'kevin_drinkWater') {
      this.currentState = GameState.FindDocument;
      this.showDialogue({
        id: 'system_findDocInstruction',
        character: this.playerSpeaker,
        text: this.t('systemDialogues.findDocumentInstruction')
      });
    }
    else if (id === 'system_findDocInstruction') {
      // Player can now click documents
    }
    else if (id === 'system_wrongDoc') {
      // Wrong document, player tries again
    }
    // After document found and read
    else if (id === 'system_documentFound') {
      this.showDialogue({
        id: 'kevin_checkBasics',
        character: this.t('characters.kevin.name'),
        text: this.t('characters.kevin.dialogues.checkBasics')
      });
    }
    else if (id === 'kevin_checkBasics') {
      this.currentState = GameState.Puzzle1_SingleChoice;
      this.updateBackground();
    }
    // After Puzzle 1 correct
    else if (id === 'system_puzzle1Correct') {
      this.showDialogue({
        id: 'kevin_composeYourself',
        character: this.t('characters.kevin.name'),
        text: this.t('characters.kevin.dialogues.composeYourself')
      });
    }
    else if (id === 'kevin_composeYourself') {
      this.showDialogue({
        id: 'kevin_priorityClient',
        character: this.t('characters.kevin.name'),
        text: this.t('characters.kevin.dialogues.priorityClient')
      });
    }
    else if (id === 'kevin_priorityClient') {
      this.currentState = GameState.PhoneCall;
      this.playSound('phone-ring.wav');
    }
    // After picking up phone
    else if (id === 'system_phonePickUp') {
      this.showDialogue({
        id: 'system_kevinTyping',
        character: this.playerSpeaker,
        text: this.t('systemDialogues.kevinTyping')
      });
    }
    else if (id === 'system_kevinTyping') {
      this.currentState = GameState.FindLaptop;
      this.goBack();
    }
    // After Puzzle 2 complete
    else if (id === 'system_puzzle2Complete') {
      this.showDialogue({
        id: 'system_kevinImpressed',
        character: this.playerSpeaker,
        text: this.t('systemDialogues.kevinImpressed')
      });
    }
    else if (id === 'system_kevinImpressed') {
      this.showDialogue({
        id: 'kevin_impressed',
        character: this.t('characters.kevin.name'),
        text: this.t('characters.kevin.dialogues.impressed')
      });
    }
    else if (id === 'kevin_impressed') {
      this.showDialogue({
        id: 'ahmed_comeQuickly',
        character: this.t('characters.ahmed.name'),
        text: this.t('characters.ahmed.dialogues.comeQuickly')
      });
    }
    else if (id === 'ahmed_comeQuickly') {
      this.currentState = GameState.AhmedCalls;
      this.currentView = 'main';
      this.currentBackgroundUrl = imagePaths.ahmed_talking;
      this.showDialogue({
        id: 'ahmed_screenBlue',
        character: this.t('characters.ahmed.name'),
        text: this.t('characters.ahmed.dialogues.screenTurnedBlue')
      });
    }
    else if (id === 'ahmed_screenBlue') {
      this.showDialogue({
        id: 'ahmed_solveExercise',
        character: this.t('characters.ahmed.name'),
        text: this.t('characters.ahmed.dialogues.solveExercise')
      });
    }
    else if (id === 'ahmed_solveExercise') {
      this.currentState = GameState.PCScreen;
    }
    // After reading PC screen text
    else if (id === 'ahmed_hurry') {
      this.currentState = GameState.Puzzle3_FillGap;
      this.startPuzzle3Timer();
      this.updateBackground();
    }
    // After Puzzle 3 complete
    else if (id === 'ahmed_systemReboots') {
      this.showDialogue({
        id: 'kevin_completionThankYou',
        character: this.t('characters.kevin.name'),
        text: this.t('characters.kevin.dialogues.completionThankYou')
      });
    }
    else if (id === 'kevin_completionThankYou') {
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.currentView = 'main';
      this.playDoorSound();
      this.updateBackground();
    }

    // Only reset background if no new dialogue was shown in the chain above
    if (!this.activeDialogue) {
      this.updateBackground();
    }
  }

  /** Template calls handleDialogueDismiss — delegate to abstract implementation */
  handleDialogueDismiss(): void {
    this.dismissDialogue();
  }

  protected override onHintRequested(): void {
    this.isHintDialogue = true;
  }

  protected override getHintText(): string {
    if (this.currentState === GameState.ClickKevin) {
      return this.t('hints.clickKevin');
    } else if (this.currentState === GameState.FindDocument) {
      return this.t('hints.findDocument');
    } else if (this.currentState === GameState.Puzzle1_SingleChoice) {
      return this.t('puzzles.singleChoice.hint');
    } else if (this.currentState === GameState.PhoneCall) {
      return this.t('hints.phoneCall');
    } else if (this.currentState === GameState.FindLaptop) {
      return this.t('hints.findLaptop');
    } else if (this.currentState === GameState.Puzzle2_Matching) {
      return this.t('puzzles.matching.hint');
    } else if (this.currentState === GameState.AhmedCalls || this.currentState === GameState.PCScreen) {
      return this.t('hints.ahmedOrPCScreen');
    } else if (this.currentState === GameState.Puzzle3_FillGap) {
      return this.t('puzzles.fillGap.hint');
    } else if (this.currentState === GameState.Completion) {
      return this.t('hints.completion');
    }
    return this.t('hints.default');
  }

  // --- Intro popup ---

  protected override onIntroPopupClosed(): void {
    this.currentState = GameState.ClickKevin;
    this.showDialogue({
      id: 'selfTalk_enterPanicRoom',
      character: this.t('selfTalk.characterName'),
      text: this.t('selfTalk.enterPanicRoom')
    });
  }

  // --- Character interactions ---

  handleKevinInteraction(): void {
    const state = this.currentState;

    if (state === GameState.ClickKevin) {
      this.showDialogue({
        id: 'kevin_greeting',
        character: this.t('characters.kevin.name'),
        text: this.t('characters.kevin.dialogues.greeting')
      });
    }
    else if (state === GameState.FindDocument) {
      this.showDialogue({ character: this.t('characters.kevin.name'), text: this.t('characters.kevin.dialogues.findDocumentHint') });
    }
    else if (state === GameState.Completion) {
      this.showDialogue({ character: this.t('characters.kevin.name'), text: this.t('characters.kevin.dialogues.completionClick') });
    }
    else {
      this.showDialogue({ character: this.t('characters.kevin.name'), text: this.t('characters.kevin.dialogues.defaultBusy') });
    }
  }

  handleAhmedInteraction(): void {
    const state = this.currentState;

    if (state === GameState.AhmedCalls) {
      this.showDialogue({
        character: this.t('characters.ahmed.name'),
        text: this.t('characters.ahmed.dialogues.ahmedCallsClick')
      });
    }
    else if (state === GameState.Completion) {
      this.showDialogue({ character: this.t('characters.ahmed.name'), text: this.t('characters.ahmed.dialogues.completionClick') });
    }
    else {
      this.showDialogue({ character: this.t('characters.ahmed.name'), text: this.t('characters.ahmed.dialogues.defaultMonitoring') });
    }
  }

  // --- Document handling ---

  onDocumentClick(docId: string): void {
    if (docId === 'correct') {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundDocument = true;
      this.currentState = GameState.DocumentFound;
      this.isDocumentVisible = true;
    } else {
      this.playSound('error-buzz.mp3');
      this.wrongDocClicks++;
      this.showDialogue({ id: 'system_wrongDoc', character: this.playerSpeaker, text: this.t('systemDialogues.wrongDocument') });
    }
  }

  closeDocument(): void {
    this.isDocumentVisible = false;
    this.goBack();
    if (this.currentState === GameState.DocumentFound) {
      this.showDialogue({
        id: 'system_documentFound',
        character: this.playerSpeaker,
        text: this.t('systemDialogues.documentFound')
      });
    }
  }

  toggleDocument(): void {
    if (this.hasFoundDocument) {
      this.playSound('paper-rustle.wav');
      this.isDocumentVisible = !this.isDocumentVisible;
    }
  }

  // --- Navigation ---

  override goBack(): void {
    this.isAnimating = true;
    this.showHints = false;
    this.playSound('zoom-out.wav');
    this.resetZoom();
    setTimeout(() => {
      if (this.currentState >= GameState.RelocateToCalm && this.currentState <= GameState.FindLaptop) {
        this.currentView = 'calmCorner';
      } else {
        this.currentView = 'main';
      }
      this.updateBackground();
      this.isAnimating = false;
    }, ESCAPE_ROOM_TIMING.zoomOutDelay);
  }

  // --- PC Screen ---

  showPCScreenText(): void {
    this.showDialogue({
      character: this.playerSpeaker,
      text: this.t('pcScreen.dialogueText1')
    });
  }

  showPCScreenText2(): void {
    this.showDialogue({
      character: this.playerSpeaker,
      text: this.t('pcScreen.dialogueText2')
    });
  }

  onPCScreenContinue(): void {
    this.currentView = 'main';
    this.showDialogue({
      id: 'ahmed_hurry',
      character: this.t('characters.ahmed.name'),
      text: this.t('characters.ahmed.dialogues.hurry')
    });
  }

  // --- Puzzle 1: Single Choice ---
  submitPuzzle1(option: any): void {
    if (option.correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.puzzle1WrongAttempts.count = 0;
      this.recordPuzzleScore('Single Choice', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
      this.showDialogue({ id: 'system_puzzle1Correct', character: this.playerSpeaker, text: this.t('systemDialogues.puzzle1Correct') });
      this.currentState = GameState.PhoneCallIntro;
    } else {
      this.puzzle1TotalWrong++;
      this.handleWrongAttempt(
        this.puzzle1WrongAttempts,
        3,
        () => {
          this.puzzle1WasRevealed = true;
          this.recordPuzzleScore('Single Choice', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
          this.showDialogue({ id: 'system_puzzle1Correct', character: this.playerSpeaker, text: this.t('systemDialogues.puzzle1Correct') });
          this.currentState = GameState.PhoneCallIntro;
        },
        this.t('puzzles.singleChoice.hint'),
        this.t('puzzles.singleChoice.answerOverlay')
      );
    }
  }

  // --- Puzzle 2: Matching ---
  selectCue(id: string): void {
    const result = this.selectMatchCue(id, this.solvedMatches);
    if (result !== null) this.selectedCueId = result;
  }

  selectMatchOption(optId: string): void {
    if (!this.selectedCueId) return;

    const pair = this.matchingPairs.find(p => p.id === this.selectedCueId);
    if (pair && pair.endingId === optId) {
      this.solvedMatches.push(this.selectedCueId);
      this.selectedCueId = null;
      this.puzzleFeedback = '';
      this.isPuzzleWrong = false;
      this.matchingWrongAttempts.count = 0;
      this.playSound('success-chime.wav');

      if (this.solvedMatches.length === this.matchingPairs.length) {
        this.recordPuzzleScore('Matching', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
        this.currentState = GameState.Puzzle2_Complete;
        setTimeout(() => {
          this.showDialogue({
            id: 'system_puzzle2Complete',
            character: this.playerSpeaker,
            text: this.t('systemDialogues.puzzle2Complete')
          });
        }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
      }
    } else {
      this.puzzle2TotalWrong++;
      this.handleWrongAttempt(
        this.matchingWrongAttempts,
        3,
        () => {
          this.puzzle2WasRevealed = true;
          this.recordPuzzleScore('Matching', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
          this.solvedMatches = ['1', '2', '3', '4', '5', '6'];
          this.currentState = GameState.Puzzle2_Complete;
          setTimeout(() => {
            this.showDialogue({
              id: 'system_puzzle2Complete',
              character: this.playerSpeaker,
              text: this.t('systemDialogues.puzzle2Complete')
            });
          }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        },
        this.t('puzzles.matching.hint'),
        this.t('puzzles.matching.answerOverlay')
      );
    }
  }

  // --- Puzzle 3: Fill-in-the-gaps ---
  fillGap(word: string): void {
    this.fillGapSlot(this.userGapAnswers, word);
  }

  resetGap(): void {
    this.userGapAnswers = this.resetGapSlots(5);
  }

  // --- Skip Puzzle Methods ---
  skipPuzzle1(): void {
    this.recordPuzzleScore('Single Choice', 99, true);
    this.puzzleFeedback = '';
    this.isPuzzleWrong = false;
    this.showDialogue({ id: 'system_puzzle1Correct', character: this.playerSpeaker, text: this.t('systemDialogues.puzzle1Correct') });
    this.currentState = GameState.PhoneCallIntro;
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Matching', 99, true);
    this.puzzleFeedback = '';
    this.isPuzzleWrong = false;
    this.solvedMatches = ['1', '2', '3', '4', '5', '6'];
    this.currentState = GameState.Puzzle2_Complete;
    setTimeout(() => {
      this.showDialogue({
        id: 'system_puzzle2Complete',
        character: this.playerSpeaker,
        text: this.t('systemDialogues.puzzle2Complete')
      });
    }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
  }

  skipPuzzle3(): void {
    this.stopPuzzle3Timer();
    this.recordPuzzleScore('Fill the Gap', 99, true);
    this.puzzleFeedback = '';
    this.isPuzzleWrong = false;
    this.showDialogue({
      id: 'ahmed_systemReboots',
      character: this.t('characters.ahmed.name'),
      text: this.t('characters.ahmed.dialogues.systemReboots')
    });
  }

  /** Start the puzzle-3 hacking countdown. Decorative; no penalty on zero. */
  private startPuzzle3Timer(): void {
    this.stopPuzzle3Timer();
    this.puzzle3SecondsLeft = 90;
    this.puzzle3TimerHandle = setInterval(() => {
      if (this.puzzle3SecondsLeft > 0) {
        this.puzzle3SecondsLeft--;
      } else {
        this.stopPuzzle3Timer();
      }
    }, 1000);
  }

  private stopPuzzle3Timer(): void {
    if (this.puzzle3TimerHandle !== null) {
      clearInterval(this.puzzle3TimerHandle);
      this.puzzle3TimerHandle = null;
    }
  }

  /** Format `puzzle3SecondsLeft` as MM:SS for the puzzle card display. */
  get puzzle3TimerLabel(): string {
    const m = Math.floor(this.puzzle3SecondsLeft / 60);
    const s = this.puzzle3SecondsLeft % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /** Make sure the interval doesn't outlive the component (e.g. when the
   *  user navigates away mid-puzzle). */
  protected override onDestroy(): void {
    this.stopPuzzle3Timer();
  }

  submitGap(): void {
    const correct = ['narrows', 'pattern', 'influence', 'vulnerable', 'lowers'];
    if (JSON.stringify(this.userGapAnswers) === JSON.stringify(correct)) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.gapWrongAttempts.count = 0;
      this.stopPuzzle3Timer();
      this.recordPuzzleScore('Fill the Gap', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
      this.showDialogue({
        id: 'ahmed_systemReboots',
        character: this.t('characters.ahmed.name'),
        text: this.t('characters.ahmed.dialogues.systemReboots')
      });
    } else {
      this.puzzle3TotalWrong++;
      this.handleWrongAttempt(
        this.gapWrongAttempts,
        3,
        () => {
          this.puzzle3WasRevealed = true;
          this.recordPuzzleScore('Fill the Gap', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
          this.userGapAnswers = [...correct];
          this.showDialogue({
            id: 'ahmed_systemReboots',
            character: this.t('characters.ahmed.name'),
            text: this.t('characters.ahmed.dialogues.systemReboots')
          });
        },
        this.t('puzzles.fillGap.hint'),
        this.t('puzzles.fillGap.answerOverlay')
      );
    }
  }
}

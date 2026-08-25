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
  TalkToKate1,
  FindPhone,
  ReadEmail,
  TalkToKate2,
  GoToWhiteboard,
  Puzzle1_Matching,
  Puzzle1Complete,
  KateStory,
  Puzzle2_SingleChoice,
  ReadPaper,
  Puzzle3_FillGap,
  Puzzle3Complete,
  ClickLaptop,
  ReadStickyNote,
  Puzzle4_SingleChoice,
  Reveal,
  Completion
}

const imagePaths = {
  base: '/assets/images/trust_building/hr_office.png',
  base_door_open: '/assets/images/trust_building/hr_office_door_open.png',
  kate_hover: '/assets/images/trust_building/kate_hover.png',
  kate_talking: '/assets/images/trust_building/kate_talking.png',
  kate_hover_door_open: '/assets/images/trust_building/kate_hover_door_open.png',
  hiroshi_hover: '/assets/images/trust_building/hiroshi_hover.png',
  hiroshi_talking: '/assets/images/trust_building/hiroshi_talking.png',
  hiroshi_hover_door_open: '/assets/images/trust_building/hiroshi_hover_door_open.png',
  zoom_bag: '/assets/images/trust_building/zoom_bag.png',
  zoom_whiteboard: '/assets/images/trust_building/zoom_whiteboard.png',
  zoom_table: '/assets/images/trust_building/zoom_table.png',
  zoom_laptop: '/assets/images/trust_building/zoom_laptop.png',
  phone: '/assets/images/trust_building/phone.png',
  paper: '/assets/images/trust_building/paper.png',
  sticky_note: '/assets/images/trust_building/sticky_note.png',
};

type ViewState = 'main' | 'bag' | 'whiteboard' | 'table' | 'laptop';

const roomConfig: EscapeRoomConfig = {
  roomId: 'trust-building',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
  selector: 'app-trust-building-skill18',
  templateUrl: './trust-building-skill18.component.html',
  styleUrl: './trust-building-skill18.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
  animations: [fadeInOut]
})
export class TrustBuildingSkill18Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  // TrackBy functions to prevent *ngFor from recreating DOM when getters return new arrays
  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;
  trackByKey = (_: number, item: { key: string }) => item.key;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'main';

  // Hint System
  public isHintDialogue: boolean = false;

  // Item visibility
  isPhoneVisible: boolean = false;
  isPaperVisible: boolean = false;
  isStickyNoteVisible: boolean = false;

  // Item found flags
  hasFoundPhone: boolean = false;
  hasFoundPaper: boolean = false;
  hasFoundStickyNote: boolean = false;

  hotspots = {
    main: {
      kate: { x: 31, y: 39, width: 17, height: 42 },
      hiroshi: { x: 54, y: 37, width: 18, height: 56 },
      bag: { x: 36, y: 80, width: 17, height: 18 },
      whiteboard: { x: 42, y: 36, width: 15, height: 15 },
      table: { x: 37, y: 58, width: 20, height: 31 },
      laptop: { x: 54, y: 54, width: 8, height: 8 },
      exitDoor: { x: 68, y: 22, width: 12, height: 52 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    bag_zoom: {
      phone: { x: 6, y: 44, width: 19, height: 27 },
    },
    table_zoom: {
      paper: { x: 0, y: 46, width: 42, height: 17 },
    },
    laptop_zoom: {
      // Shifted right per MMC Mavis feedback (2026-05-09): the sticky-note
      // hotspot was too far to the left of the actual visible note.
      stickyNote: { x: 78, y: 27, width: 12, height: 16 },
    },
    whiteboard_zoom: {
      content: { x: 15, y: 15, width: 70, height: 70 },
    }
  };

  // --- Puzzle 1: Matching (7 pairs) ---
  get matchingPairs() {
    return [
      { id: '1', cue: this.t('puzzles.matching.columnA.items.1'), stateId: 'E' },
      { id: '2', cue: this.t('puzzles.matching.columnA.items.2'), stateId: 'A' },
      { id: '3', cue: this.t('puzzles.matching.columnA.items.3'), stateId: 'D' },
      { id: '4', cue: this.t('puzzles.matching.columnA.items.4'), stateId: 'C' },
      { id: '5', cue: this.t('puzzles.matching.columnA.items.5'), stateId: 'F' },
      { id: '6', cue: this.t('puzzles.matching.columnA.items.6'), stateId: 'G' },
      { id: '7', cue: this.t('puzzles.matching.columnA.items.7'), stateId: 'B' }
    ];
  }
  get matchingOptions() {
    return [
      { id: 'A', text: this.t('puzzles.matching.columnB.items.A') },
      { id: 'B', text: this.t('puzzles.matching.columnB.items.B') },
      { id: 'C', text: this.t('puzzles.matching.columnB.items.C') },
      { id: 'D', text: this.t('puzzles.matching.columnB.items.D') },
      { id: 'E', text: this.t('puzzles.matching.columnB.items.E') },
      { id: 'F', text: this.t('puzzles.matching.columnB.items.F') },
      { id: 'G', text: this.t('puzzles.matching.columnB.items.G') }
    ];
  }
  selectedCueId: string | null = null;
  solvedMatches: string[] = [];
  matchingWrongAttempts: number = 0;
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;

  // --- Puzzle 2: Single Choice (4 options) ---
  get puzzle2Options() {
    return [
      { id: 'a', text: this.t('puzzles.singleChoice1.options.a'), correct: false },
      { id: 'b', text: this.t('puzzles.singleChoice1.options.b'), correct: false },
      { id: 'c', text: this.t('puzzles.singleChoice1.options.c'), correct: true },
      { id: 'd', text: this.t('puzzles.singleChoice1.options.d'), correct: false }
    ];
  }
  puzzle2WrongAttempts: number = 0;
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;

  // --- Puzzle 3: Fill-the-Gap (4 blanks) ---
  get gapSentenceParts() {
    return [
      this.t('puzzles.fillGap.sentenceParts.0'),
      this.t('puzzles.fillGap.sentenceParts.1'),
      this.t('puzzles.fillGap.sentenceParts.2'),
      this.t('puzzles.fillGap.sentenceParts.3'),
      this.t('puzzles.fillGap.sentenceParts.4')
    ];
  }
  get gapOptions() {
    return [
      this.t('puzzles.fillGap.options.0'),
      this.t('puzzles.fillGap.options.1'),
      this.t('puzzles.fillGap.options.2'),
      this.t('puzzles.fillGap.options.3')
    ];
  }
  userGapAnswers: string[] = [null!, null!, null!, null!];
  gapWrongAttempts: number = 0;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  // --- Puzzle 4: Single Choice (2 options) ---
  get puzzle4Options() {
    return [
      { id: 'a', text: this.t('puzzles.singleChoice2.options.a'), correct: false },
      { id: 'b', text: this.t('puzzles.singleChoice2.options.b'), correct: true }
    ];
  }
  puzzle4WrongAttempts: number = 0;
  puzzle4TotalWrong: number = 0;
  puzzle4WasRevealed: boolean = false;

  override get characterImages(): CharacterImageMap {
    return {
      kate: { hover: imagePaths.kate_hover, hoverDoorOpen: imagePaths.kate_hover_door_open },
      hiroshi: { hover: imagePaths.hiroshi_hover, hoverDoorOpen: imagePaths.hiroshi_hover_door_open },
    };
  }

  protected override canInteractWithCharacter(): boolean {
    return this.currentView === 'main' && !this.activeDialogue && !this.isAnimating;
  }

  public override get isMainViewActive(): boolean {
    return this.currentView === 'main';
  }

  public override get isQuizActive(): boolean {
    return this.currentState === GameState.Puzzle1_Matching ||
      this.currentState === GameState.Puzzle2_SingleChoice ||
      this.currentState === GameState.Puzzle3_FillGap ||
      this.currentState === GameState.Puzzle4_SingleChoice;
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

  // --- Background ---
  override updateBackground(): void {
    if (this.activeDialogue) return;

    // Show kate talking image during quizzes
    if (this.currentState === GameState.Puzzle1_Matching ||
        this.currentState === GameState.Puzzle2_SingleChoice ||
        this.currentState === GameState.Puzzle3_FillGap ||
        this.currentState === GameState.Puzzle4_SingleChoice) {
      this.currentBackgroundUrl = imagePaths.kate_talking;
      return;
    }

    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }

    switch (this.currentView) {
      case 'bag': this.currentBackgroundUrl = imagePaths.zoom_bag; break;
      case 'whiteboard': this.currentBackgroundUrl = imagePaths.zoom_whiteboard; break;
      case 'table': this.currentBackgroundUrl = imagePaths.zoom_table; break;
      case 'laptop': this.currentBackgroundUrl = imagePaths.zoom_laptop; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  // --- Hint ---
  protected override onHintRequested(): void {
    this.isHintDialogue = true;
  }

  protected override getHintText(): string {
    if (this.currentState === GameState.Intro) {
      return this.t('hints.intro');
    } else if (this.currentState === GameState.TalkToKate1) {
      return this.t('hints.talkToKate1');
    } else if (this.currentState === GameState.FindPhone) {
      return this.t('hints.findPhone');
    } else if (this.currentState === GameState.ReadEmail) {
      return this.t('hints.readEmail');
    } else if (this.currentState === GameState.TalkToKate2) {
      return this.t('hints.talkToKate2');
    } else if (this.currentState === GameState.GoToWhiteboard) {
      return this.t('hints.goToWhiteboard');
    } else if (this.currentState === GameState.Puzzle1_Matching) {
      return this.t('hints.puzzle1Matching');
    } else if (this.currentState === GameState.Puzzle1Complete) {
      return this.t('hints.puzzle1Complete');
    } else if (this.currentState === GameState.KateStory) {
      return this.t('hints.kateStory');
    } else if (this.currentState === GameState.Puzzle2_SingleChoice) {
      return this.t('puzzles.singleChoice1.hint');
    } else if (this.currentState === GameState.ReadPaper) {
      return this.t('hints.readPaper');
    } else if (this.currentState === GameState.Puzzle3_FillGap) {
      return this.t('hints.puzzle3FillGap');
    } else if (this.currentState === GameState.Puzzle3Complete) {
      return this.t('hints.puzzle3Complete');
    } else if (this.currentState === GameState.ClickLaptop) {
      return this.t('hints.clickLaptop');
    } else if (this.currentState === GameState.ReadStickyNote) {
      return this.t('hints.readStickyNote');
    } else if (this.currentState === GameState.Puzzle4_SingleChoice) {
      return this.t('puzzles.singleChoice2.hint');
    } else if (this.currentState === GameState.Reveal) {
      return this.t('hints.reveal');
    } else if (this.currentState === GameState.Completion) {
      return this.t('hints.completion');
    }
    return this.t('hints.default');
  }

  // --- Hotspot clicks ---
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

    // Kate interaction
    if (target === 'kate') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.kate_talking;
      this.handleKateInteraction();
      return;
    }

    // Hiroshi interaction
    if (target === 'hiroshi') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.hiroshi_talking;
      this.handleHiroshiInteraction();
      return;
    }

    if (this.currentView === 'main') {
      // Bag area — only active during FindPhone state
      if (target === 'bag' && this.currentState === GameState.FindPhone) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'bag';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on phone within zoomed view
        }, 2.5);
        return;
      }

      // Whiteboard — only active during GoToWhiteboard state
      if (target === 'whiteboard' && this.currentState === GameState.GoToWhiteboard) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'whiteboard';
          this.updateBackground();
          this.resetZoom(true);
          // Player must click hotspot within zoomed view to start puzzle
        }, 2.5);
        return;
      }

      // Table — only active during ReadPaper state
      if (target === 'table' && this.currentState === GameState.ReadPaper) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'table';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on paper within zoomed view
        }, 2.5);
        return;
      }

      // Laptop — only active during ClickLaptop state
      if (target === 'laptop' && this.currentState === GameState.ClickLaptop) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'laptop';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on sticky note within zoomed view
        }, 2.5);
        return;
      }
    }

    // --- Click within whiteboard zoomed view to start puzzle ---
    if (this.currentView === 'whiteboard' && target === 'whiteboardContent' && this.currentState === GameState.GoToWhiteboard) {
      this.playSound('paper-rustle.wav');
      this.currentState = GameState.Puzzle1_Matching;
      this.updateBackground();
      return;
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'bag' && target === 'phone' && this.currentState === GameState.FindPhone) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundPhone = true;
      this.isPhoneVisible = true;
      return;
    }

    if (this.currentView === 'table' && target === 'paper' && this.currentState === GameState.ReadPaper) {
      this.playSound('paper-rustle.wav');
      this.hasFoundPaper = true;
      this.isPaperVisible = true;
      return;
    }

    if (this.currentView === 'laptop' && target === 'stickyNote' && this.currentState === GameState.ClickLaptop) {
      this.hasFoundStickyNote = true;
      this.isStickyNoteVisible = true;
      return;
    }
  }

  // --- Character Interactions ---

  handleKateInteraction(): void {
    const state = this.currentState;
    const kateName = this.t('characters.kate.name');

    if (state === GameState.TalkToKate1) {
      this.showDialogue({ character: kateName, text: this.t('characters.kate.dialogues.greet'), id: 'kate_greet' });
    }
    else if (state === GameState.TalkToKate2) {
      this.showDialogue({ character: kateName, text: this.t('characters.kate.dialogues.goToWhiteboard'), id: 'kate_goToWhiteboard' });
    }
    else if (state === GameState.Puzzle1Complete) {
      this.showDialogue({ character: kateName, text: this.t('characters.kate.dialogues.puzzle1Complete'), id: 'kate_puzzle1Complete' });
    }
    else if (state === GameState.KateStory) {
      this.showDialogue({ character: kateName, text: this.t('characters.kate.dialogues.personalStory'), id: 'kate_personalStory' });
    }
    else if (state === GameState.Completion) {
      this.showDialogue({ character: kateName, text: this.t('characters.kate.dialogues.completion'), id: 'kate_completion' });
    }
    else {
      this.showDialogue({ character: kateName, text: this.t('characters.kate.dialogues.default'), id: 'kate_default' });
    }
  }

  handleHiroshiInteraction(): void {
    const state = this.currentState;
    const hiroshiName = this.t('characters.hiroshi.name');

    if (state === GameState.Puzzle3Complete) {
      this.showDialogue({ character: hiroshiName, text: this.t('characters.hiroshi.dialogues.puzzle3Complete'), id: 'hiroshi_puzzle3Complete' });
    }
    else if (state === GameState.Reveal) {
      this.showDialogue({ character: hiroshiName, text: this.t('characters.hiroshi.dialogues.reveal'), id: 'hiroshi_reveal' });
    }
    else if (state === GameState.Completion && this.isDoorOpen) {
      this.showDialogue({ character: hiroshiName, text: this.t('characters.hiroshi.dialogues.completion'), id: 'hiroshi_completion' });
    }
    else {
      this.showDialogue({ character: hiroshiName, text: this.t('characters.hiroshi.dialogues.default'), id: 'hiroshi_default' });
    }
  }

  // --- Dialogue dismissal ---
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

    const kateName = this.t('characters.kate.name');
    const hiroshiName = this.t('characters.hiroshi.name');

    // Always ensure we're back on main view when dismissing dialogues during non-zoom states
    if (this.currentView !== 'main' && !['system_findPhone', 'system_emailRead', 'system_noticePaper', 'system_paperRead', 'system_clickLaptop', 'system_stickyNoteRead'].includes(id || '')) {
      this.currentView = 'main';
    }

    // Intro → player self-talk → TalkToKate1
    if (id === 'system_selfTalk') {
      this.currentState = GameState.TalkToKate1;
    }
    // Kate greets, proposes exercise → FindPhone
    else if (id === 'kate_greet') {
      this.showDialogue({ character: kateName, text: this.t('characters.kate.dialogues.proposeExercise'), id: 'kate_proposeExercise' });
    }
    else if (id === 'kate_proposeExercise') {
      this.currentState = GameState.FindPhone;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.findPhone'), id: 'system_findPhone' });
    }
    else if (id === 'system_findPhone') {
      // Player should now click the bag area
    }
    // Phone found → ReadEmail overlay closed → TalkToKate2
    else if (id === 'system_emailRead') {
      this.currentState = GameState.TalkToKate2;
    }
    // Kate says go to whiteboard → GoToWhiteboard
    else if (id === 'kate_goToWhiteboard') {
      this.currentState = GameState.GoToWhiteboard;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.goToWhiteboard'), id: 'system_goToWhiteboard' });
    }
    else if (id === 'system_goToWhiteboard') {
      // Player should now click the whiteboard
    }
    // Puzzle 1 complete system message → Puzzle1Complete (click Kate)
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    // Kate responds to puzzle1 completion → KateStory. Prompt the player
    // to click Kate again — without this, the next step is invisible to
    // anyone who didn't intuit it (MMC Mavis feedback, 2026-05-09).
    else if (id === 'kate_puzzle1Complete') {
      this.currentState = GameState.KateStory;
      this.showDialogue({
        character: this.playerSpeaker,
        text: this.t('systemDialogues.talkToKateAgain'),
        id: 'system_talkToKateAgain',
      });
    }
    else if (id === 'system_talkToKateAgain') {
      // Player should now click Kate again
    }
    // Kate tells personal story → system says react
    else if (id === 'kate_personalStory') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.reactToStory'), id: 'system_reactToStory' });
    }
    else if (id === 'system_reactToStory') {
      this.currentState = GameState.Puzzle2_SingleChoice;
      this.updateBackground();
    }
    // Puzzle 2 complete → ReadPaper
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.noticePaper'), id: 'system_noticePaper' });
    }
    else if (id === 'system_noticePaper') {
      // Player should now click the table
    }
    // Paper read → Puzzle3_FillGap
    else if (id === 'system_paperRead') {
      this.currentState = GameState.Puzzle3_FillGap;
      this.updateBackground();
    }
    // Puzzle 3 complete → Kate thanks, Hiroshi speaks
    else if (id === 'system_puzzle3Complete') {
      this.showDialogue({ character: kateName, text: this.t('characters.kate.dialogues.puzzle3Thanks'), id: 'kate_puzzle3Thanks' });
    }
    else if (id === 'kate_puzzle3Thanks') {
      // State already changed to Puzzle3Complete before dialogue was shown
      this.showDialogue({ character: hiroshiName, text: this.t('characters.hiroshi.dialogues.puzzle3Complete'), id: 'hiroshi_puzzle3Complete' });
    }
    // Hiroshi speaks about tool → ClickLaptop
    else if (id === 'hiroshi_puzzle3Complete') {
      this.currentState = GameState.ClickLaptop;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickLaptop'), id: 'system_clickLaptop' });
    }
    else if (id === 'system_clickLaptop') {
      // Player should now click the laptop
    }
    // Sticky note read → Puzzle4
    else if (id === 'system_stickyNoteRead') {
      this.currentState = GameState.Puzzle4_SingleChoice;
      this.updateBackground();
    }
    // Puzzle 4 complete → Reveal. Prompt the player to click Hiroshi so
    // they don't get stuck wondering what to do next (MMC Mavis 2026-05-09).
    else if (id === 'system_puzzle4Complete') {
      this.showDialogue({
        character: this.playerSpeaker,
        text: this.t('systemDialogues.talkToHiroshi'),
        id: 'system_talkToHiroshi',
      });
    }
    else if (id === 'system_talkToHiroshi') {
      // Player should now click Hiroshi
    }
    // Hiroshi reveals it was a test
    else if (id === 'hiroshi_reveal') {
      this.showDialogue({ character: kateName, text: this.t('characters.kate.dialogues.finalWords'), id: 'kate_finalWords' });
    }
    // Kate final words → door opens → Completion
    else if (id === 'kate_finalWords') {
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.playDoorSound();
      this.updateBackground();
    }
  }

  /** Template-facing alias for dismissDialogue (HTML calls handleDialogueDismiss) */
  handleDialogueDismiss(): void {
    this.dismissDialogue();
  }

  // --- Intro popup closed ---
  protected override onIntroPopupClosed(): void {
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.selfTalk'), id: 'system_selfTalk' });
  }

  // --- UI Helpers ---

  protected override resetZoomState(): void {
    this.currentView = 'main';
  }

  closePhone(): void {
    this.isPhoneVisible = false;
    this.goBack();
    if (this.currentState === GameState.FindPhone) {
      this.currentState = GameState.ReadEmail;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.emailRead'), id: 'system_emailRead' });
    }
  }

  closePaper(): void {
    this.isPaperVisible = false;
    this.goBack();
    if (this.currentState === GameState.ReadPaper) {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.paperRead'), id: 'system_paperRead' });
    }
  }

  closeStickyNote(): void {
    this.isStickyNoteVisible = false;
    this.goBack();
    if (this.currentState === GameState.ClickLaptop) {
      this.currentState = GameState.ReadStickyNote;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.stickyNoteRead'), id: 'system_stickyNoteRead' });
    }
  }

  togglePhone(): void {
    if (this.hasFoundPhone) {
      this.playSound('paper-rustle.wav');
      this.isPhoneVisible = !this.isPhoneVisible;
      this.isPaperVisible = false;
      this.isStickyNoteVisible = false;
    }
  }

  togglePaper(): void {
    if (this.hasFoundPaper) {
      this.playSound('paper-rustle.wav');
      this.isPaperVisible = !this.isPaperVisible;
      this.isPhoneVisible = false;
      this.isStickyNoteVisible = false;
    }
  }

  toggleStickyNote(): void {
    if (this.hasFoundStickyNote) {
      this.playSound('paper-rustle.wav');
      this.isStickyNoteVisible = !this.isStickyNoteVisible;
      this.isPhoneVisible = false;
      this.isPaperVisible = false;
    }
  }

  // --- Skip Puzzle Methods ---

  skipPuzzle1(): void {
    this.recordPuzzleScore('Matching', 99, true);
    this.currentView = 'main';
    this.currentState = GameState.Puzzle1Complete;
    this.puzzleFeedback = '';
    this.updateBackground();
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Single Choice 1', 99, true);
    this.currentState = GameState.ReadPaper;
    this.puzzleFeedback = '';
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.noticePaper'), id: 'system_noticePaper' });
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Fill the Gap', 99, true);
    this.puzzleFeedback = '';
    const kateName = this.t('characters.kate.name');
    this.showDialogue({ character: kateName, text: this.t('characters.kate.dialogues.puzzle3Thanks'), id: 'kate_puzzle3Thanks' });
  }

  skipPuzzle4(): void {
    this.recordPuzzleScore('Single Choice 2', 99, true);
    this.currentState = GameState.Reveal;
    this.puzzleFeedback = '';
    this.updateBackground();
  }

  // --- Puzzle 1: Matching Logic ---

  selectCue(id: string): void {
    const result = this.selectMatchCue(id, this.solvedMatches);
    if (result !== null) this.selectedCueId = result;
  }

  selectMatchOption(optId: string): void {
    if (!this.selectedCueId) return;

    const pair = this.matchingPairs.find(p => p.id === this.selectedCueId);
    if (pair && pair.stateId === optId) {
      this.solvedMatches.push(this.selectedCueId);
      this.selectedCueId = null;
      this.puzzleFeedback = '';
      this.isPuzzleWrong = false;
      this.matchingWrongAttempts = 0;
      this.playSound('success-chime.wav');

      if (this.solvedMatches.length === this.matchingPairs.length) {
        this.recordPuzzleScore('Matching', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
        setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Puzzle1Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.allCorrect'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
      }
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.matchingWrongAttempts++;
      this.puzzle1TotalWrong++;

      if (this.matchingWrongAttempts >= 3) {
        this.puzzle1WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.matching.answerOverlay');
        this.answerOverlayCallback = () => {
          this.matchingWrongAttempts = 0;
          this.solvedMatches = ['1', '2', '3', '4', '5', '6', '7'];
          this.recordPuzzleScore('Matching', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
          setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Puzzle1Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.revealedComplete'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.matching.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Puzzle 2: Single Choice (4 options) ---

  submitPuzzle2(option: { id: string; text: string; correct: boolean }): void {
    if (option.correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.puzzle2WrongAttempts = 0;
      this.recordPuzzleScore('Single Choice 1', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
      setTimeout(() => {
        this.currentState = GameState.ReadPaper;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice1.feedback.correct'), id: 'system_puzzle2Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.puzzle2WrongAttempts++;
      this.puzzle2TotalWrong++;

      if (this.puzzle2WrongAttempts >= 3) {
        this.puzzle2WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.singleChoice1.answerOverlay');
        this.answerOverlayCallback = () => {
          this.puzzle2WrongAttempts = 0;
          this.recordPuzzleScore('Single Choice 1', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
          setTimeout(() => {
        this.currentState = GameState.ReadPaper;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice1.feedback.correct'), id: 'system_puzzle2Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.singleChoice1.feedback.wrong');
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Puzzle 3: Fill-the-Gap (4 blanks) ---

  fillGap(word: string): void {
    this.fillGapSlot(this.userGapAnswers, word);
  }

  resetGap(): void {
    this.userGapAnswers = this.resetGapSlots(4) as string[];
  }

  submitGap(): void {
    const correct = ['hear and value your input', 'truly matter to this team', 'participate in this process together', 'side by side'];
    if (JSON.stringify(this.userGapAnswers) === JSON.stringify(correct)) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.gapWrongAttempts = 0;
      this.recordPuzzleScore('Fill the Gap', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
      setTimeout(() => {
        this.currentState = GameState.Puzzle3Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.fillGap.feedback.correct'), id: 'system_puzzle3Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.gapWrongAttempts++;
      this.puzzle3TotalWrong++;

      if (this.gapWrongAttempts >= 3) {
        this.puzzle3WasRevealed = true;
        this.userGapAnswers = [...correct];
        this.answerOverlayText = this.t('puzzles.fillGap.answerOverlay');
        this.answerOverlayCallback = () => {
          this.gapWrongAttempts = 0;
          this.recordPuzzleScore('Fill the Gap', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
          setTimeout(() => {
        this.currentState = GameState.Puzzle3Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.fillGap.feedback.correct'), id: 'system_puzzle3Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.fillGap.feedback.wrong');
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Puzzle 4: Single Choice (2 options) ---

  submitPuzzle4(option: { id: string; text: string; correct: boolean }): void {
    if (option.correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.puzzle4WrongAttempts = 0;
      this.recordPuzzleScore('Single Choice 2', this.puzzle4TotalWrong, this.puzzle4WasRevealed);
      setTimeout(() => {
        this.currentState = GameState.Reveal;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice2.feedback.correct'), id: 'system_puzzle4Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.puzzle4WrongAttempts++;
      this.puzzle4TotalWrong++;

      if (this.puzzle4WrongAttempts >= 3) {
        this.puzzle4WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.singleChoice2.answerOverlay');
        this.answerOverlayCallback = () => {
          this.puzzle4WrongAttempts = 0;
          this.recordPuzzleScore('Single Choice 2', this.puzzle4TotalWrong, this.puzzle4WasRevealed);
          setTimeout(() => {
        this.currentState = GameState.Reveal;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice2.feedback.correct'), id: 'system_puzzle4Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.singleChoice2.feedback.wrong');
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }
}

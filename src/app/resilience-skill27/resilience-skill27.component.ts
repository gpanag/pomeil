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
import { Dialogue, EscapeRoomConfig, CharacterImageMap, ESCAPE_ROOM_TIMING } from '../shared/escape-room/escape-room.interfaces';

import { RoomHelpButtonComponent } from '../shared/escape-room/room-help-button/room-help-button.component';
enum GameState {
  Intro,
  TalkToLayla1,
  FindBox,
  ReadBox,
  TalkToLayla2,
  Puzzle1_Matching,
  Puzzle1Complete,
  FindDrawer,
  ReadNote,
  TalkToIvan,
  Puzzle2_FillGap,
  Puzzle2Complete,
  Puzzle3_Pattern,
  Reveal,
  Completion
}

const imagePaths = {
  base_empty: '/assets/images/resilience/archive_room.png',
  base: '/assets/images/resilience/archive_room_default.png',
  base_door_open: '/assets/images/resilience/archive_room_door_open.png',
  layla_hover: '/assets/images/resilience/layla_hover.png',
  layla_talking: '/assets/images/resilience/layla_talking.png',
  layla_hover_door_open: '/assets/images/resilience/layla_hover_door_open.png',
  ivan_hover: '/assets/images/resilience/ivan_hover.png',
  ivan_talking: '/assets/images/resilience/ivan_talking.png',
  ivan_hover_door_open: '/assets/images/resilience/ivan_hover_door_open.png',
  zoom_shelf: '/assets/images/resilience/zoom_shelf.png',
  zoom_boxes: '/assets/images/resilience/zoom_boxes.png',
  zoom_desk: '/assets/images/resilience/zoom_desk.png',
  zoom_drawer: '/assets/images/resilience/zoom_drawer.png',
  box: '/assets/images/resilience/box.png',
  note: '/assets/images/resilience/note.png',
};

type ViewState = 'main' | 'shelf' | 'boxes' | 'desk' | 'drawer';

const roomConfig: EscapeRoomConfig = {
  roomId: 'resilience',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
    selector: 'app-resilience-skill27',
    templateUrl: './resilience-skill27.component.html',
    styleUrl: './resilience-skill27.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class ResilienceSkill27Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;
  trackByKey = (_: number, item: { key: string }) => item.key;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'main';

  public isHintDialogue: boolean = false;

  // Item visibility
  isBoxVisible: boolean = false;
  isNoteVisible: boolean = false;

  // Item found flags
  hasFoundBox: boolean = false;
  hasFoundNote: boolean = false;

  // Quest step tracking for FindBox and FindDrawer
  hasClickedShelf: boolean = false;
  hasClickedBoxes: boolean = false;
  hasClickedShelfForDrawer: boolean = false;
  hasClickedDesk: boolean = false;

  hotspots = {
    main: {
      ivan: { x: 28, y: 28, width: 33, height: 70 },
      layla: { x: 63, y: 13, width: 24, height: 86 },
      shelfLeft: { x: 20, y: 25, width: 18, height: 60 },
      shelfRight: { x: 84, y: 0, width: 16, height: 100 },
      lowShelf: { x: 20, y: 24, width: 18, height: 59 },
      desk: { x: 0, y: 86, width: 66, height: 14 },
      drawer: { x: 22, y: 71, width: 6, height: 13 },
      exitDoor: { x: 2, y: 0, width: 18, height: 88 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    boxes_zoom: {
      box: { x: 52, y: 60, width: 9, height: 17 },
    },
    drawer_zoom: {
      note: { x: 30, y: 45, width: 18, height: 15 },
    }
  };

  // --- Puzzle 1: Matching (4 pairs) ---
  // Correct matches: 1→D, 2→C, 3→A, 4→B
  get matchingPairs() {
    return [
      { id: '1', cue: this.t('puzzles.matching.columnA.items.1'), stateId: 'D' },
      { id: '2', cue: this.t('puzzles.matching.columnA.items.2'), stateId: 'C' },
      { id: '3', cue: this.t('puzzles.matching.columnA.items.3'), stateId: 'A' },
      { id: '4', cue: this.t('puzzles.matching.columnA.items.4'), stateId: 'B' }
    ];
  }
  get matchingOptions() {
    return [
      { id: 'A', text: this.t('puzzles.matching.columnB.items.A') },
      { id: 'B', text: this.t('puzzles.matching.columnB.items.B') },
      { id: 'C', text: this.t('puzzles.matching.columnB.items.C') },
      { id: 'D', text: this.t('puzzles.matching.columnB.items.D') }
    ];
  }
  selectedCueId: string | null = null;
  solvedMatches: string[] = [];
  matchingWrongAttempts: number = 0;
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;

  // --- Puzzle 2: Fill-the-Gap (3 blanks) ---
  get gapSentenceParts() {
    return [
      this.t('puzzles.fillGap.sentenceParts.0'),
      this.t('puzzles.fillGap.sentenceParts.1'),
      this.t('puzzles.fillGap.sentenceParts.2'),
      this.t('puzzles.fillGap.sentenceParts.3')
    ];
  }
  get gapOptions() {
    return [
      this.t('puzzles.fillGap.options.0'),
      this.t('puzzles.fillGap.options.1'),
      this.t('puzzles.fillGap.options.2'),
      this.t('puzzles.fillGap.options.3'),
      this.t('puzzles.fillGap.options.4')
    ];
  }
  userGapAnswers: string[] = [null!, null!, null!];
  gapWrongAttempts: number = 0;
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;

  // --- Puzzle 3: Pattern Recognition (3 scenarios) ---
  get patternScenarios() {
    return [
      {
        text: this.t('puzzles.pattern.scenarios.0.text'),
        options: [
          { text: this.t('puzzles.pattern.scenarios.0.options.0.text'), correct: false },
          { text: this.t('puzzles.pattern.scenarios.0.options.1.text'), correct: true },
          { text: this.t('puzzles.pattern.scenarios.0.options.2.text'), correct: false },
          { text: this.t('puzzles.pattern.scenarios.0.options.3.text'), correct: false }
        ],
        hint: this.t('puzzles.pattern.scenarios.0.hint')
      },
      {
        text: this.t('puzzles.pattern.scenarios.1.text'),
        options: [
          { text: this.t('puzzles.pattern.scenarios.1.options.0.text'), correct: false },
          { text: this.t('puzzles.pattern.scenarios.1.options.1.text'), correct: true },
          { text: this.t('puzzles.pattern.scenarios.1.options.2.text'), correct: false },
          { text: this.t('puzzles.pattern.scenarios.1.options.3.text'), correct: false }
        ],
        hint: this.t('puzzles.pattern.scenarios.1.hint')
      },
      {
        text: this.t('puzzles.pattern.scenarios.2.text'),
        options: [
          { text: this.t('puzzles.pattern.scenarios.2.options.0.text'), correct: false },
          { text: this.t('puzzles.pattern.scenarios.2.options.1.text'), correct: true },
          { text: this.t('puzzles.pattern.scenarios.2.options.2.text'), correct: false },
          { text: this.t('puzzles.pattern.scenarios.2.options.3.text'), correct: false }
        ],
        hint: this.t('puzzles.pattern.scenarios.2.hint')
      }
    ];
  }
  currentPatternIndex: number = 0;
  patternWrongAttempts: number = 0;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  override get characterImages(): CharacterImageMap {
    return {
      layla: { hover: imagePaths.layla_hover, hoverDoorOpen: imagePaths.layla_hover_door_open },
      ivan: { hover: imagePaths.ivan_hover, hoverDoorOpen: imagePaths.ivan_hover_door_open },
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
      this.currentState === GameState.Puzzle2_FillGap ||
      this.currentState === GameState.Puzzle3_Pattern;
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

    if (this.currentState === GameState.Puzzle1_Matching ||
        this.currentState === GameState.Puzzle2_FillGap ||
        this.currentState === GameState.Puzzle3_Pattern) {
      this.currentBackgroundUrl = imagePaths.layla_talking;
      return;
    }

    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }

    switch (this.currentView) {
      case 'shelf': this.currentBackgroundUrl = imagePaths.zoom_shelf; break;
      case 'boxes': this.currentBackgroundUrl = imagePaths.zoom_boxes; break;
      case 'desk': this.currentBackgroundUrl = imagePaths.zoom_desk; break;
      case 'drawer': this.currentBackgroundUrl = imagePaths.zoom_drawer; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  // --- Hint ---
  protected override onHintRequested(): void {
    this.isHintDialogue = true;
  }

  protected override getHintText(): string {
    if (this.currentState === GameState.Intro || this.currentState === GameState.TalkToLayla1) return this.t('hints.talkToLayla');
    if (this.currentState === GameState.FindBox) return this.t('hints.findBox');
    if (this.currentState === GameState.TalkToLayla2) return this.t('hints.talkToLayla2');
    if (this.currentState === GameState.Puzzle1_Matching) return this.t('puzzles.matching.feedback.wrong');
    if (this.currentState === GameState.Puzzle1Complete) return this.t('hints.talkToLayla');
    if (this.currentState === GameState.FindDrawer) return this.t('hints.findDrawer');
    if (this.currentState === GameState.TalkToIvan) return this.t('hints.talkToIvan');
    if (this.currentState === GameState.Puzzle2_FillGap) return this.t('puzzles.fillGap.feedback.wrong');
    if (this.currentState === GameState.Puzzle3_Pattern) return this.patternScenarios[this.currentPatternIndex].hint;
    if (this.currentState === GameState.Completion) return this.t('hints.completion');
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

    // Layla interaction
    if (target === 'layla') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.layla_talking;
      this.handleLaylaInteraction();
      return;
    }

    // Ivan interaction
    if (target === 'ivan') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.ivan_talking;
      this.handleIvanInteraction();
      return;
    }

    if (this.currentView === 'main') {
      // --- FindBox quest ---
      if (this.currentState === GameState.FindBox) {
        // Click shelf (wrong) → hint about boxes
        if ((target === 'shelfLeft' || target === 'shelfRight') && !this.hasClickedShelf) {
          this.hasClickedShelf = true;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickShelf'), id: 'system_clickShelf' });
          return;
        }

        // Click boxes area (wrong) → hint about lowest shelves
        if ((target === 'shelfLeft' || target === 'shelfRight') && this.hasClickedShelf && !this.hasClickedBoxes) {
          this.hasClickedBoxes = true;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickBoxes'), id: 'system_clickBoxes' });
          return;
        }

        // Click low shelf (correct) → zoom to boxes, player finds the box
        if (target === 'lowShelf' || ((target === 'shelfLeft' || target === 'shelfRight') && this.hasClickedBoxes)) {
          this.zoomToLocation('lowShelf', this.hotspots.main, () => {
            this.currentView = 'boxes';
            this.updateBackground();
            this.resetZoom(true);
            // Don't auto-give item — player must click on box within zoomed view
          }, 2.5);
          return;
        }
      }

      // --- FindDrawer quest ---
      if (this.currentState === GameState.FindDrawer) {
        // Click shelf (wrong)
        if ((target === 'shelfLeft' || target === 'shelfRight') && !this.hasClickedShelfForDrawer) {
          this.hasClickedShelfForDrawer = true;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickShelfForDrawer'), id: 'system_clickShelfForDrawer' });
          return;
        }

        // Click desk (wrong)
        if (target === 'desk' && !this.hasClickedDesk) {
          this.hasClickedDesk = true;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickDesk'), id: 'system_clickDesk' });
          return;
        }

        // Click drawer (correct) → zoom to drawer, player finds the note
        if (target === 'drawer' || (target === 'desk' && this.hasClickedDesk)) {
          this.zoomToLocation('drawer', this.hotspots.main, () => {
            this.currentView = 'drawer';
            this.updateBackground();
            this.resetZoom(true);
            // Don't auto-give item — player must click on note within zoomed view
          }, 2.5);
          return;
        }
      }
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'boxes' && target === 'box' && this.currentState === GameState.FindBox) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundBox = true;
      this.isBoxVisible = true;
      return;
    }

    if (this.currentView === 'drawer' && target === 'note' && this.currentState === GameState.FindDrawer) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundNote = true;
      this.isNoteVisible = true;
      return;
    }
  }

  // --- Character Interactions ---

  handleLaylaInteraction(): void {
    const state = this.currentState;
    const laylaName = this.t('characters.layla.name');

    if (state === GameState.TalkToLayla1) {
      this.showDialogue({ character: laylaName, text: this.t('characters.layla.dialogues.greet'), id: 'layla_greet' });
    }
    else if (state === GameState.TalkToLayla2) {
      this.showDialogue({ character: laylaName, text: this.t('characters.layla.dialogues.boxFound'), id: 'layla_boxFound' });
    }
    else if (state === GameState.Puzzle1Complete) {
      this.showDialogue({ character: laylaName, text: this.t('characters.layla.dialogues.findDrawer'), id: 'layla_findDrawer' });
    }
    else if (state === GameState.Completion) {
      this.showDialogue({ character: laylaName, text: this.t('characters.layla.dialogues.completion'), id: 'layla_completion' });
    }
    else {
      this.showDialogue({ character: laylaName, text: this.t('characters.layla.dialogues.default'), id: 'layla_default' });
    }
  }

  handleIvanInteraction(): void {
    const state = this.currentState;
    const ivanName = this.t('characters.ivan.name');

    if (state === GameState.TalkToIvan) {
      this.showDialogue({ character: ivanName, text: this.t('characters.ivan.dialogues.noteFound'), id: 'ivan_noteFound' });
    }
    else if (state === GameState.Completion && this.isDoorOpen) {
      this.showDialogue({ character: ivanName, text: this.t('characters.ivan.dialogues.completion'), id: 'ivan_completion' });
    }
    else {
      this.showDialogue({ character: ivanName, text: this.t('characters.ivan.dialogues.default'), id: 'ivan_default' });
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

    const laylaName = this.t('characters.layla.name');
    const ivanName = this.t('characters.ivan.name');

    // Always return to main view when dismissing non-zoom dialogues
    if (this.currentView !== 'main' && !['system_clickShelf', 'system_clickBoxes', 'system_clickShelfForDrawer', 'system_clickDesk'].includes(id || '')) {
      this.currentView = 'main';
      this.updateBackground();
    }

    // Intro → self-talk → TalkToLayla1
    if (id === 'system_selfTalk') {
      this.currentState = GameState.TalkToLayla1;
    }
    // Layla greets → asks to find box
    else if (id === 'layla_greet') {
      this.showDialogue({ character: laylaName, text: this.t('characters.layla.dialogues.findBox'), id: 'layla_findBox' });
    }
    else if (id === 'layla_findBox') {
      this.currentState = GameState.FindBox;
    }
    // System hints during FindBox quest
    else if (id === 'system_clickShelf') { /* player should check boxes */ }
    else if (id === 'system_clickBoxes') { /* player should check lowest shelves */ }
    // Box found and read → TalkToLayla2
    else if (id === 'system_foundBox') {
      this.currentState = GameState.TalkToLayla2;
    }
    // Layla: box found → resilience explanation chain
    else if (id === 'layla_boxFound') {
      this.showDialogue({ character: laylaName, text: this.t('characters.layla.dialogues.resilienceExplanation1'), id: 'layla_resilienceExplanation1' });
    }
    else if (id === 'layla_resilienceExplanation1') {
      this.showDialogue({ character: laylaName, text: this.t('characters.layla.dialogues.resilienceExplanation2'), id: 'layla_resilienceExplanation2' });
    }
    else if (id === 'layla_resilienceExplanation2') {
      this.showDialogue({ character: laylaName, text: this.t('characters.layla.dialogues.resilienceExplanation3'), id: 'layla_resilienceExplanation3' });
    }
    else if (id === 'layla_resilienceExplanation3') {
      this.showDialogue({ character: laylaName, text: this.t('characters.layla.dialogues.resilienceExplanation4'), id: 'layla_resilienceExplanation4' });
    }
    else if (id === 'layla_resilienceExplanation4') {
      this.currentState = GameState.Puzzle1_Matching;
      this.updateBackground();
    }
    // Puzzle 1 complete system message
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    // Layla says find the drawer
    else if (id === 'layla_findDrawer') {
      this.currentState = GameState.FindDrawer;
      this.hasClickedShelfForDrawer = false;
      this.hasClickedDesk = false;
    }
    // System hints during FindDrawer quest
    else if (id === 'system_clickShelfForDrawer') { /* player should check desk */ }
    else if (id === 'system_clickDesk') { /* player should check drawer */ }
    // Note found → TalkToIvan
    else if (id === 'system_foundNote') {
      this.currentState = GameState.TalkToIvan;
    }
    // Ivan: note found → start puzzle 2
    else if (id === 'ivan_noteFound') {
      this.currentState = GameState.Puzzle2_FillGap;
      this.updateBackground();
    }
    // Puzzle 2 complete → Puzzle 3
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
    }
    // Puzzle 3 / Pattern complete → Ivan final words
    else if (id === 'ivan_patternComplete') {
      this.showDialogue({ character: ivanName, text: this.t('characters.ivan.dialogues.farewell'), id: 'ivan_farewell' });
    }
    else if (id === 'ivan_farewell') {
      this.showDialogue({ character: ivanName, text: this.t('characters.ivan.dialogues.readyNext'), id: 'ivan_readyNext' });
    }
    else if (id === 'ivan_readyNext') {
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.playDoorSound();
      this.updateBackground();
    }
  }

  handleDialogueDismiss(): void {
    this.dismissDialogue();
  }

  protected override onIntroPopupClosed(): void {
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.selfTalk'), id: 'system_selfTalk' });
  }

  protected override resetZoomState(): void {
    this.currentView = 'main';
  }

  // --- Item popups ---

  closeBox(): void {
    this.isBoxVisible = false;
    this.goBack();
    if (this.currentState === GameState.FindBox) {
      this.currentState = GameState.ReadBox;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundBox'), id: 'system_foundBox' });
    }
  }

  closeNote(): void {
    this.isNoteVisible = false;
    this.goBack();
    if (this.currentState === GameState.FindDrawer) {
      this.currentState = GameState.ReadNote;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundNote'), id: 'system_foundNote' });
    }
  }

  toggleBox(): void {
    if (this.hasFoundBox) {
      this.playSound('paper-rustle.wav');
      this.isBoxVisible = !this.isBoxVisible;
      this.isNoteVisible = false;
    }
  }

  toggleNote(): void {
    if (this.hasFoundNote) {
      this.playSound('paper-rustle.wav');
      this.isNoteVisible = !this.isNoteVisible;
      this.isBoxVisible = false;
    }
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
          this.solvedMatches = ['1', '2', '3', '4'];
          this.recordPuzzleScore('Matching', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
          setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Puzzle1Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.allCorrect'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.matching.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Puzzle 2: Fill-the-Gap (3 blanks) ---

  fillGap(word: string): void {
    this.fillGapSlot(this.userGapAnswers, word);
  }

  resetGap(): void {
    this.userGapAnswers = this.resetGapSlots(3) as string[];
  }

  submitGap(): void {
    const correct = [
      this.t('puzzles.fillGap.correctAnswers.0'),
      this.t('puzzles.fillGap.correctAnswers.1'),
      this.t('puzzles.fillGap.correctAnswers.2')
    ];
    if (JSON.stringify(this.userGapAnswers) === JSON.stringify(correct)) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.gapWrongAttempts = 0;
      this.recordPuzzleScore('Fill the Gap', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
      setTimeout(() => {
        this.currentState = GameState.Puzzle3_Pattern;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.fillGap.feedback.correct'), id: 'system_puzzle2Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.gapWrongAttempts++;
      this.puzzle2TotalWrong++;

      if (this.gapWrongAttempts >= 3) {
        this.puzzle2WasRevealed = true;
        this.userGapAnswers = [...correct];
        this.answerOverlayText = this.t('puzzles.fillGap.answerOverlay');
        this.answerOverlayCallback = () => {
          this.gapWrongAttempts = 0;
          this.recordPuzzleScore('Fill the Gap', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
          setTimeout(() => {
        this.currentState = GameState.Puzzle3_Pattern;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.fillGap.feedback.correct'), id: 'system_puzzle2Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.fillGap.feedback.wrong');
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Puzzle 3: Pattern Recognition (3 scenarios) ---

  skipPuzzle1(): void {
    this.recordPuzzleScore('Matching', 99, true);
    this.puzzleFeedback = '';
    this.matchingWrongAttempts = 0;
    this.solvedMatches = ['1', '2', '3', '4'];
    this.currentView = 'main';
    this.currentState = GameState.Puzzle1Complete;
    this.updateBackground();
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Fill the Gap', 99, true);
    this.puzzleFeedback = '';
    this.gapWrongAttempts = 0;
    this.userGapAnswers = [null!, null!, null!];
    this.currentState = GameState.Puzzle3_Pattern;
    this.updateBackground();
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Pattern Recognition', 99, true);
    this.puzzleFeedback = '';
    this.patternWrongAttempts = 0;
    this.currentPatternIndex = 0;
    this.currentState = GameState.Reveal;
    this.updateBackground();
    this.showDialogue({ character: this.t('characters.ivan.name'), text: this.t('characters.ivan.dialogues.finalWords'), id: 'ivan_patternComplete' });
  }

  submitPattern(isCorrect: boolean, hint: string): void {
    if (isCorrect) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.patternWrongAttempts = 0;
      if (this.currentPatternIndex < this.patternScenarios.length - 1) {
        this.currentPatternIndex++;
      } else {
        this.recordPuzzleScore('Pattern Recognition', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
        this.currentState = GameState.Reveal;
        this.updateBackground();
        this.showDialogue({ character: this.t('characters.ivan.name'), text: this.t('characters.ivan.dialogues.finalWords'), id: 'ivan_patternComplete' });
      }
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.patternWrongAttempts++;
      this.puzzle3TotalWrong++;

      if (this.patternWrongAttempts >= 3) {
        this.puzzle3WasRevealed = true;
        const scenario = this.patternScenarios[this.currentPatternIndex];
        const correctOption = scenario.options.find(o => o.correct);
        this.answerOverlayText = this.t('puzzles.pattern.answerOverlayPrefix') + scenario.text + this.t('puzzles.pattern.answerOverlayCorrectLabel') + '"' + (correctOption?.text || '') + '"' + this.t('puzzles.pattern.answerOverlayExplanationLabel') + scenario.hint;
        this.answerOverlayCallback = () => {
          this.patternWrongAttempts = 0;
          if (this.currentPatternIndex < this.patternScenarios.length - 1) {
            this.currentPatternIndex++;
          } else {
            this.recordPuzzleScore('Pattern Recognition', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
            this.currentState = GameState.Reveal;
            this.updateBackground();
            this.showDialogue({ character: this.t('characters.ivan.name'), text: this.t('characters.ivan.dialogues.finalWords'), id: 'ivan_patternComplete' });
          }
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = hint;
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }
}

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
  TalkToAmelia1,
  FindFolder,
  ReadFolder,
  TalkToMarco,
  MarcoDialogue2,
  MarcoDialogue3,
  MarcoDialogue4,
  MarcoDialogue5,
  Puzzle1_Matching,
  Puzzle1Complete,
  FindFrame,
  ReadFrame,
  TalkToAmelia2,
  Puzzle2_FillGap,
  Puzzle2Complete,
  Puzzle3_Pattern,
  Reveal,
  Completion
}

const imagePaths = {
  base_empty: '/assets/images/tolerance/coworking_office.png',
  base: '/assets/images/tolerance/coworking_office_default.png',
  base_door_open: '/assets/images/tolerance/coworking_office_door_open.png',
  amelia_hover: '/assets/images/tolerance/amelia_hover.png',
  amelia_talking: '/assets/images/tolerance/amelia_talking.png',
  amelia_hover_door_open: '/assets/images/tolerance/amelia_hover_door_open.png',
  marco_hover: '/assets/images/tolerance/marco_hover.png',
  marco_talking: '/assets/images/tolerance/marco_talking.png',
  marco_hover_door_open: '/assets/images/tolerance/marco_hover_door_open.png',
  zoom_table: '/assets/images/tolerance/zoom_table.png',
  zoom_frames: '/assets/images/tolerance/zoom_frames.png',
  folder: '/assets/images/tolerance/folder.png',
  frame: '/assets/images/tolerance/frame.png',
};

type ViewState = 'main' | 'table' | 'marco_table' | 'frames';

const roomConfig: EscapeRoomConfig = {
  roomId: 'tolerance',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
  selector: 'app-tolerance-skill30',
  templateUrl: './tolerance-skill30.component.html',
  styleUrl: './tolerance-skill30.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
  animations: [fadeInOut]
})
export class ToleranceSkill30Component extends EscapeRoomBaseComponent {

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
  isFolderVisible: boolean = false;
  isFrameVisible: boolean = false;

  // Item found flags
  hasFoundFolder: boolean = false;
  hasFoundFrame: boolean = false;

  // Wrong click tracking for search phases
  hasClickedTable: boolean = false;
  hasClickedLaptop: boolean = false;
  hasClickedPocket: boolean = false;

  hotspots = {
    main: {
      amelia: { x: 27, y: 16, width: 20, height: 83 },
      marco: { x: 53, y: 13, width: 24, height: 86 },
      table: { x: 0, y: 66, width: 100, height: 33 },
      frames: { x: 79, y: 26, width: 5, height: 20 },
      laptop: { x: 10, y: 64, width: 13, height: 12 },
      marcoFolder: { x: 78, y: 57, width: 10, height: 15 },
      exitDoor: { x: 14, y: 19, width: 16, height: 47 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    marco_zoom: {
      folder: { x: 35, y: 50, width: 30, height: 30 },
    },
    frames_zoom: {
      frame: { x: 19, y: 24, width: 26, height: 84 },
    }
  };

  // --- Puzzle 1: Matching (4 pairs) ---
  get matchingPairs() {
    return [
      { id: '1', cue: this.t('puzzles.matching.columnA.items.1'), stateId: 'A' },
      { id: '2', cue: this.t('puzzles.matching.columnA.items.2'), stateId: 'B' },
      { id: '3', cue: this.t('puzzles.matching.columnA.items.3'), stateId: 'D' },
      { id: '4', cue: this.t('puzzles.matching.columnA.items.4'), stateId: 'C' }
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
      amelia: { hover: imagePaths.amelia_hover, hoverDoorOpen: imagePaths.amelia_hover_door_open },
      marco: { hover: imagePaths.marco_hover, hoverDoorOpen: imagePaths.marco_hover_door_open },
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

    if (this.isQuizActive) {
      this.currentBackgroundUrl = imagePaths.amelia_talking;
      return;
    }

    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }

    switch (this.currentView) {
      case 'table': this.currentBackgroundUrl = imagePaths.zoom_table; break;
      case 'marco_table': this.currentBackgroundUrl = imagePaths.zoom_table; break;
      case 'frames': this.currentBackgroundUrl = imagePaths.zoom_frames; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  // --- Hint ---
  protected override onHintRequested(): void {
    this.isHintDialogue = true;
  }

  protected override getHintText(): string {
    if (this.currentState === GameState.TalkToAmelia1) return this.t('hints.talkToAmelia1');
    if (this.currentState === GameState.FindFolder) return this.t('hints.findFolder');
    if (this.currentState === GameState.TalkToMarco ||
        this.currentState === GameState.MarcoDialogue2 ||
        this.currentState === GameState.MarcoDialogue3 ||
        this.currentState === GameState.MarcoDialogue4 ||
        this.currentState === GameState.MarcoDialogue5) return this.t('hints.talkToMarco');
    if (this.currentState === GameState.Puzzle1_Matching) return this.t('hints.puzzle1Matching');
    if (this.currentState === GameState.Puzzle1Complete) return this.t('hints.talkToAmelia2');
    if (this.currentState === GameState.FindFrame) return this.t('hints.findFrame');
    if (this.currentState === GameState.TalkToAmelia2) return this.t('hints.talkToAmelia2');
    if (this.currentState === GameState.Puzzle2_FillGap) return this.t('hints.puzzle2FillGap');
    if (this.currentState === GameState.Puzzle3_Pattern) return this.t('puzzles.pattern.scenarios.' + this.currentPatternIndex + '.hint');
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

    // Amelia interaction
    if (target === 'amelia') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.amelia_talking;
      this.handleAmeliaInteraction();
      return;
    }

    // Marco interaction
    if (target === 'marco') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.marco_talking;
      this.handleMarcoInteraction();
      return;
    }

    if (this.currentView === 'main') {
      // FindFolder phase: table click (wrong)
      if (target === 'table' && this.currentState === GameState.FindFolder && !this.hasClickedTable) {
        this.hasClickedTable = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickTable'), id: 'system_clickTable' });
        return;
      }

      // FindFolder phase: frames click (wrong)
      if (target === 'frames' && this.currentState === GameState.FindFolder) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickFrames1'), id: 'system_clickFrames1' });
        return;
      }

      // FindFolder phase: Marco's folder (correct — zoom in, player must click folder within zoomed view)
      if (target === 'marcoFolder' && this.currentState === GameState.FindFolder) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'marco_table';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on folder within zoomed view
        }, 2.5);
        return;
      }

      // FindFrame phase: laptop click (wrong)
      if (target === 'laptop' && this.currentState === GameState.FindFrame && !this.hasClickedLaptop) {
        this.hasClickedLaptop = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickLaptop'), id: 'system_clickLaptop' });
        return;
      }

      // FindFrame phase: Marco's pocket click (wrong)
      if (target === 'marcoFolder' && this.currentState === GameState.FindFrame && !this.hasClickedPocket) {
        this.hasClickedPocket = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickPocket'), id: 'system_clickPocket' });
        return;
      }

      // FindFrame phase: frames click (correct — zoom in, player must click frame within zoomed view)
      if (target === 'frames' && this.currentState === GameState.FindFrame) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'frames';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on frame within zoomed view
        }, 2.5);
        return;
      }
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'marco_table' && target === 'folder' && this.currentState === GameState.FindFolder) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundFolder = true;
      this.isFolderVisible = true;
      return;
    }

    if (this.currentView === 'frames' && target === 'frame' && this.currentState === GameState.FindFrame) {
      this.playSound('success-chime.wav');
      this.hasFoundFrame = true;
      this.isFrameVisible = true;
      return;
    }
  }

  // --- Character Interactions ---

  handleAmeliaInteraction(): void {
    const state = this.currentState;
    const ameliaName = this.t('characters.amelia.name');

    if (state === GameState.TalkToAmelia1) {
      this.showDialogue({ character: ameliaName, text: this.t('characters.amelia.dialogues.greet'), id: 'amelia_greet' });
    }
    else if (state === GameState.Puzzle1Complete) {
      this.showDialogue({ character: ameliaName, text: this.t('characters.amelia.dialogues.puzzle1Done'), id: 'amelia_puzzle1Done' });
    }
    else if (state === GameState.TalkToAmelia2) {
      this.showDialogue({ character: ameliaName, text: this.t('characters.amelia.dialogues.frameFound'), id: 'amelia_frameFound' });
    }
    else if (state === GameState.Completion) {
      this.showDialogue({ character: ameliaName, text: this.t('characters.amelia.dialogues.completion'), id: 'amelia_completion' });
    }
    else {
      this.showDialogue({ character: ameliaName, text: this.t('characters.amelia.dialogues.default'), id: 'amelia_default' });
    }
  }

  handleMarcoInteraction(): void {
    const state = this.currentState;
    const marcoName = this.t('characters.marco.name');

    if (state === GameState.TalkToMarco) {
      this.showDialogue({ character: marcoName, text: this.t('characters.marco.dialogues.folderFound'), id: 'marco_folderFound' });
    }
    else {
      this.showDialogue({ character: marcoName, text: this.t('characters.marco.dialogues.default'), id: 'marco_default' });
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

    const ameliaName = this.t('characters.amelia.name');
    const marcoName = this.t('characters.marco.name');

    // Reset view to main when not in zoom-dependent states
    if (this.currentView !== 'main' && !['system_foundFrame'].includes(id || '')) {
      this.currentView = 'main';
    }

    // Intro -> self talk -> TalkToAmelia1
    if (id === 'system_selfTalk') {
      this.currentState = GameState.TalkToAmelia1;
    }
    // Amelia greets -> find folder
    else if (id === 'amelia_greet') {
      this.showDialogue({ character: ameliaName, text: this.t('characters.amelia.dialogues.findFolder'), id: 'amelia_findFolder' });
    }
    else if (id === 'amelia_findFolder') {
      this.showDialogue({ character: ameliaName, text: this.t('characters.amelia.dialogues.findFolderHint'), id: 'amelia_findFolderHint' });
    }
    else if (id === 'amelia_findFolderHint') {
      this.currentState = GameState.FindFolder;
    }
    // Wrong clicks during FindFolder
    else if (id === 'system_clickTable') { /* player should try other objects */ }
    else if (id === 'system_clickFrames1') { /* player should try Marco's folder */ }
    // Folder found and read -> TalkToMarco
    else if (id === 'system_foundFolder') {
      this.currentState = GameState.TalkToMarco;
    }
    // Marco dialogue chain
    else if (id === 'marco_folderFound') {
      this.currentState = GameState.MarcoDialogue2;
      this.showDialogue({ character: marcoName, text: this.t('characters.marco.dialogues.toleranceExplained'), id: 'marco_toleranceExplained' });
    }
    else if (id === 'marco_toleranceExplained') {
      this.currentState = GameState.MarcoDialogue3;
      this.showDialogue({ character: marcoName, text: this.t('characters.marco.dialogues.toleranceDetails'), id: 'marco_toleranceDetails' });
    }
    else if (id === 'marco_toleranceDetails') {
      this.currentState = GameState.MarcoDialogue4;
      this.showDialogue({ character: marcoName, text: this.t('characters.marco.dialogues.toleranceSummary'), id: 'marco_toleranceSummary' });
    }
    else if (id === 'marco_toleranceSummary') {
      this.currentState = GameState.MarcoDialogue5;
      this.showDialogue({ character: marcoName, text: this.t('characters.marco.dialogues.letsQuiz'), id: 'marco_letsQuiz' });
    }
    else if (id === 'marco_letsQuiz') {
      this.currentState = GameState.Puzzle1_Matching;
      this.updateBackground();
    }
    // Puzzle 1 complete
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    // Amelia puzzle1Done -> FindFrame
    else if (id === 'amelia_puzzle1Done') {
      this.showDialogue({ character: ameliaName, text: this.t('characters.amelia.dialogues.findFrame'), id: 'amelia_findFrame' });
    }
    else if (id === 'amelia_findFrame') {
      this.currentState = GameState.FindFrame;
      this.hasClickedLaptop = false;
      this.hasClickedPocket = false;
    }
    // Wrong clicks during FindFrame
    else if (id === 'system_clickLaptop') { /* player should try other objects */ }
    else if (id === 'system_clickPocket') { /* player should try the frames */ }
    // Frame found
    else if (id === 'system_foundFrame') {
      this.currentView = 'main';
      this.currentState = GameState.TalkToAmelia2;
      this.updateBackground();
    }
    // Amelia frameFound -> puzzles
    else if (id === 'amelia_frameFound') {
      this.currentState = GameState.Puzzle2_FillGap;
      this.updateBackground();
    }
    // Puzzle 2 complete
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
    }
    // Puzzle 3 complete -> Amelia final words
    else if (id === 'system_puzzle3Complete') {
      // State already changed before dialogue was shown
      this.showDialogue({ character: ameliaName, text: this.t('characters.amelia.dialogues.finalWords'), id: 'amelia_finalWords' });
    }
    else if (id === 'amelia_finalWords') {
      this.showDialogue({ character: ameliaName, text: this.t('characters.amelia.dialogues.skillComplete'), id: 'amelia_skillComplete' });
    }
    else if (id === 'amelia_skillComplete') {
      this.showDialogue({ character: ameliaName, text: this.t('characters.amelia.dialogues.completion'), id: 'amelia_completion' });
    }
    else if (id === 'amelia_completion') {
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.playDoorSound();
      this.updateBackground();
    }
  }

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

  closeFolder(): void {
    this.isFolderVisible = false;
    if (this.currentState === GameState.FindFolder) {
      this.currentState = GameState.ReadFolder;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundFolder'), id: 'system_foundFolder' });
    }
  }

  closeFrame(): void {
    this.isFrameVisible = false;
    this.goBack();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundFrame'), id: 'system_foundFrame' });
  }

  toggleFolder(): void {
    if (this.hasFoundFolder) {
      this.playSound('paper-rustle.wav');
      this.isFolderVisible = !this.isFolderVisible;
      this.isFrameVisible = false;
    }
  }

  toggleFrame(): void {
    if (this.hasFoundFrame) {
      this.playSound('paper-rustle.wav');
      this.isFrameVisible = !this.isFrameVisible;
      this.isFolderVisible = false;
    }
  }

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
    this.currentView = 'main';
    this.currentPatternIndex = 0;
    this.currentState = GameState.Puzzle3_Pattern;
    this.updateBackground();
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Pattern Recognition', 99, true);
    this.puzzleFeedback = '';
    this.patternWrongAttempts = 0;
    this.currentPatternIndex = 0;
    this.currentView = 'main';
    this.currentState = GameState.Reveal;
    this.updateBackground();
    const ameliaName = this.t('characters.amelia.name');
    this.showDialogue({ character: ameliaName, text: this.t('characters.amelia.dialogues.finalWords'), id: 'amelia_finalWords' });
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
    const correct = ['listen', 'plan', 'small'];
    if (JSON.stringify(this.userGapAnswers) === JSON.stringify(correct)) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.gapWrongAttempts = 0;
      this.recordPuzzleScore('Fill the Gap', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
      setTimeout(() => {
        this.currentView = 'main';
        this.currentPatternIndex = 0;
        this.currentState = GameState.Puzzle2Complete;
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
        this.currentView = 'main';
        this.currentPatternIndex = 0;
        this.currentState = GameState.Puzzle2Complete;
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

  submitPattern(isCorrect: boolean, hint: string): void {
    if (isCorrect) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.patternWrongAttempts = 0;
      if (this.currentPatternIndex < this.patternScenarios.length - 1) {
        this.currentPatternIndex++;
      } else {
        this.recordPuzzleScore('Pattern Recognition', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
        setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Reveal;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.pattern.scenarios.' + this.currentPatternIndex + '.hint'), id: 'system_puzzle3Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
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
            setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Reveal;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.pattern.scenarios.' + this.currentPatternIndex + '.hint'), id: 'system_puzzle3Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
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

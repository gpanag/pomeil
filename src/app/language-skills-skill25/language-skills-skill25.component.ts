import { Component, Inject, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { EscapeRoomBaseComponent } from '../shared/escape-room/escape-room-base.component';
import { EscapeRoomTextService } from '../shared/escape-room/escape-room-text.service';
import { fadeInOut } from '../shared/escape-room/escape-room.animations';
import { Dialogue, EscapeRoomConfig, CharacterImageMap, ESCAPE_ROOM_TIMING } from '../shared/escape-room/escape-room.interfaces';

import { RoomHelpButtonComponent } from '../shared/escape-room/room-help-button/room-help-button.component';
enum GameState {
  Intro,
  TalkToMaria1,
  FindTablet,
  ReadTablet,
  TalkToMaria2,
  Puzzle1_FillGap,
  Puzzle1Complete,
  FindFlipchart,
  ReadFlipchart,
  TalkToMaria3,
  Puzzle2_SingleChoice,
  Puzzle2Complete,
  Puzzle3_SequenceOrder,
  Reveal,
  Completion
}

const imagePaths = {
  base_empty: '/assets/images/language_skills/waiting_room.png',
  base: '/assets/images/language_skills/waiting_room_default.png',
  base_door_open: '/assets/images/language_skills/waiting_room_door_open.png',
  maria_hover: '/assets/images/language_skills/maria_hover.png',
  maria_talking: '/assets/images/language_skills/maria_talking.png',
  maria_hover_door_open: '/assets/images/language_skills/maria_hover_door_open.png',
  kenji_hover: '/assets/images/language_skills/kenji_hover.png',
  kenji_talking: '/assets/images/language_skills/kenji_talking.png',
  kenji_hover_door_open: '/assets/images/language_skills/kenji_hover_door_open.png',
  zoom_desk: '/assets/images/language_skills/zoom_desk.png',
  zoom_flipchart: '/assets/images/language_skills/zoom_flipchart.png',
  tablet: '/assets/images/language_skills/tablet.png',
  flipchart: '/assets/images/language_skills/flipchart.png',
};

type ViewState = 'main' | 'desk' | 'flipchart';

const roomConfig: EscapeRoomConfig = {
  roomId: 'language-skills',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
    selector: 'app-language-skills-skill25',
    templateUrl: './language-skills-skill25.component.html',
    styleUrl: './language-skills-skill25.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule, DragDropModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class LanguageSkillsSkill25Component extends EscapeRoomBaseComponent {

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
  isTabletVisible: boolean = false;
  isFlipchartVisible: boolean = false;

  // Item found flags
  hasFoundTablet: boolean = false;
  hasFoundFlipchart: boolean = false;

  // Track bookshelves click (wrong spot before finding tablet)
  hasClickedBookshelves: boolean = false;

  hotspots = {
    main: {
      maria: { x: 8, y: 22, width: 16, height: 70 },
      kenji: { x: 58, y: 48, width: 18, height: 34 },
      desk: { x: 38, y: 52, width: 22, height: 32 },
      bookshelves: { x: 75, y: 2, width: 23, height: 82 },
      flipchartArea: { x: 22, y: 40, width: 10, height: 39 },
      worldMap: { x: 25, y: 21, width: 48, height: 41 },
      exitDoor: { x: 0, y: 8, width: 8, height: 82 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    desk_zoom: {
      tablet: { x: 13, y: 61, width: 57, height: 35 },
    },
    flipchart_zoom: {
      flipchartContent: { x: 27, y: 3, width: 60, height: 90 },
    }
  };

  // --- Puzzle 1: Fill-in-the-Gap (2 blanks) ---
  get gapSentenceParts() {
    return [
      this.t('puzzles.fillGap.sentenceParts.0'),
      this.t('puzzles.fillGap.sentenceParts.1'),
      this.t('puzzles.fillGap.sentenceParts.2')
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
  userGapAnswers: string[] = [null!, null!];
  gapWrongAttempts: number = 0;
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;

  // --- Puzzle 2: Single Choice ---
  get puzzle2Options() {
    return [
      { id: 'a', text: this.t('puzzles.singleChoice.options.a'), correct: false },
      { id: 'b', text: this.t('puzzles.singleChoice.options.b'), correct: true },
      { id: 'c', text: this.t('puzzles.singleChoice.options.c'), correct: false },
      { id: 'd', text: this.t('puzzles.singleChoice.options.d'), correct: false }
    ];
  }
  puzzle2WrongAttempts: number = 0;
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;

  // --- Puzzle 3: Sequence Ordering (4 items) ---
  userSequence: string[] = [];
  puzzle3WrongAttempts: number = 0;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  override get characterImages(): CharacterImageMap {
    return {
      maria: { hover: imagePaths.maria_hover, hoverDoorOpen: imagePaths.maria_hover_door_open },
      kenji: { hover: imagePaths.kenji_hover, hoverDoorOpen: imagePaths.kenji_hover_door_open },
    };
  }

  protected override canInteractWithCharacter(): boolean {
    return this.currentView === 'main' && !this.activeDialogue && !this.isAnimating;
  }

  public override get isMainViewActive(): boolean {
    return this.currentView === 'main';
  }

  public override get isQuizActive(): boolean {
    return this.currentState === GameState.Puzzle1_FillGap ||
      this.currentState === GameState.Puzzle2_SingleChoice ||
      this.currentState === GameState.Puzzle3_SequenceOrder;
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

  initSequenceOrder(): void {
    const items = [
      this.t('puzzles.sequenceOrder.items.0'),
      this.t('puzzles.sequenceOrder.items.1'),
      this.t('puzzles.sequenceOrder.items.2'),
      this.t('puzzles.sequenceOrder.items.3')
    ].filter(i => i);
    this.userSequence = [...items].sort(() => Math.random() - 0.5);
  }

  override updateBackground(): void {
    if (this.activeDialogue) return;
    if (this.isQuizActive) { this.currentBackgroundUrl = imagePaths.maria_talking; return; }
    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }
    switch (this.currentView) {
      case 'desk': this.currentBackgroundUrl = imagePaths.zoom_desk; break;
      case 'flipchart': this.currentBackgroundUrl = imagePaths.zoom_flipchart; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  protected override onHintRequested(): void { this.isHintDialogue = true; }

  protected override getHintText(): string {
    if (this.currentState === GameState.TalkToMaria1) return this.t('hints.talkToMaria');
    if (this.currentState === GameState.FindTablet) return this.t('hints.findTablet');
    if (this.currentState === GameState.TalkToMaria2) return this.t('hints.talkToMaria2');
    if (this.currentState === GameState.Puzzle1_FillGap) return this.t('hints.puzzle1FillGap');
    if (this.currentState === GameState.Puzzle1Complete) return this.t('hints.talkToMaria2');
    if (this.currentState === GameState.FindFlipchart) return this.t('hints.findFlipchart');
    if (this.currentState === GameState.TalkToMaria3) return this.t('hints.talkToMaria3');
    if (this.currentState === GameState.Puzzle2_SingleChoice) return this.t('puzzles.singleChoice.hint');
    if (this.currentState === GameState.Puzzle3_SequenceOrder) return this.t('puzzles.sequenceOrder.hints.0');
    if (this.currentState === GameState.Completion) return this.t('hints.completion');
    return this.t('hints.default');
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

    if (target === 'maria') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.maria_talking;
      this.handleMariaInteraction();
      return;
    }

    if (target === 'kenji') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.kenji_talking;
      const name = this.t('characters.kenji.name');
      this.showDialogue({ character: name, text: this.t('characters.kenji.dialogues.busy'), id: 'kenji_busy' });
      return;
    }

    if (this.currentView === 'main') {
      // Bookshelves click during FindTablet (wrong spot)
      if (target === 'bookshelves' && this.currentState === GameState.FindTablet) {
        this.hasClickedBookshelves = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickBookshelves'), id: 'system_clickBookshelves' });
        return;
      }

      // Desk click during FindTablet (correct spot)
      if (target === 'desk' && this.currentState === GameState.FindTablet) {
        this.zoomToLocation('desk', this.hotspots.main, () => {
          this.currentView = 'desk';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on tablet within zoomed view
        }, 2.5);
        return;
      }

      // World map click during FindFlipchart (wrong spot)
      if (target === 'worldMap' && this.currentState === GameState.FindFlipchart) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickWorldMap'), id: 'system_clickWorldMap' });
        return;
      }

      // Flipchart click during FindFlipchart (correct spot)
      if (target === 'flipchartArea' && this.currentState === GameState.FindFlipchart) {
        this.zoomToLocation('flipchartArea', this.hotspots.main, () => {
          this.currentView = 'flipchart';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on flipchart content within zoomed view
        }, 2.5);
        return;
      }
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'desk' && target === 'tablet' && this.currentState === GameState.FindTablet) {
      this.playSound('success-chime.wav');
      this.hasFoundTablet = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundTablet'), id: 'system_foundTablet' });
      return;
    }

    if (this.currentView === 'flipchart' && target === 'flipchartContent' && this.currentState === GameState.FindFlipchart) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundFlipchart = true;
      this.isFlipchartVisible = true;
      return;
    }
  }

  handleMariaInteraction(): void {
    const name = this.t('characters.maria.name');
    if (this.currentState === GameState.TalkToMaria1) {
      this.showDialogue({ character: name, text: this.t('characters.maria.dialogues.greet'), id: 'maria_greet' });
    } else if (this.currentState === GameState.TalkToMaria2) {
      this.showDialogue({ character: name, text: this.t('characters.maria.dialogues.tabletFound'), id: 'maria_tabletFound' });
    } else if (this.currentState === GameState.Puzzle1Complete) {
      this.showDialogue({ character: name, text: this.t('characters.maria.dialogues.quiz1Done'), id: 'maria_quiz1Done' });
    } else if (this.currentState === GameState.TalkToMaria3) {
      this.showDialogue({ character: name, text: this.t('characters.maria.dialogues.flipchartFound'), id: 'maria_flipchartFound' });
    } else if (this.currentState === GameState.Completion) {
      this.showDialogue({ character: name, text: this.t('characters.maria.dialogues.completion'), id: 'maria_completion' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.maria.dialogues.default'), id: 'maria_default' });
    }
  }

  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;
    this.updateBackground();

    if (this.isHintDialogue) { this.isHintDialogue = false; this.showHintPulse(); }
    else { this.showHints = false; }

    const mariaName = this.t('characters.maria.name');

    if (this.currentView !== 'main' && !['system_foundTablet'].includes(id || '')) {
      this.currentView = 'main';
    }

    if (id === 'system_selfTalk') { this.currentState = GameState.TalkToMaria1; }
    else if (id === 'maria_greet') {
      this.showDialogue({ character: mariaName, text: this.t('characters.maria.dialogues.findTablet'), id: 'maria_findTablet' });
    }
    else if (id === 'maria_findTablet') { this.currentState = GameState.FindTablet; }
    else if (id === 'system_clickBookshelves') { /* player should now click desk */ }
    else if (id === 'system_foundTablet') {
      this.isTabletVisible = true;
    }
    else if (id === 'system_tabletRead') {
      this.currentView = 'main';
      this.currentState = GameState.TalkToMaria2;
      this.updateBackground();
    }
    else if (id === 'maria_tabletFound') {
      this.showDialogue({ character: mariaName, text: this.t('characters.maria.dialogues.quiz1Intro'), id: 'maria_quiz1Intro' });
    }
    else if (id === 'maria_quiz1Intro') {
      this.currentState = GameState.Puzzle1_FillGap;
      this.updateBackground();
    }
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'maria_quiz1Done') {
      this.showDialogue({ character: mariaName, text: this.t('characters.maria.dialogues.findFlipchart'), id: 'maria_findFlipchart' });
    }
    else if (id === 'maria_findFlipchart') { this.currentState = GameState.FindFlipchart; }
    else if (id === 'system_clickWorldMap') { /* player should look for flipchart */ }
    else if (id === 'system_foundFlipchart') {
      this.currentState = GameState.TalkToMaria3;
    }
    else if (id === 'maria_flipchartFound') {
      this.showDialogue({ character: mariaName, text: this.t('characters.maria.dialogues.puzzle2Intro'), id: 'maria_puzzle2Intro' });
    }
    else if (id === 'maria_puzzle2Intro') {
      this.currentState = GameState.Puzzle2_SingleChoice;
      this.updateBackground();
    }
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'system_puzzle3Complete') {
      // State already changed before dialogue was shown
      this.showDialogue({ character: mariaName, text: this.t('characters.maria.dialogues.finalWords'), id: 'maria_finalWords' });
    }
    else if (id === 'maria_finalWords') {
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.playDoorSound();
      this.updateBackground();
    }
  }

  handleDialogueDismiss(): void { this.dismissDialogue(); }

  protected override onIntroPopupClosed(): void {
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.selfTalk'), id: 'system_selfTalk' });
  }

  protected override resetZoomState(): void { this.currentView = 'main'; }

  closeTablet(): void {
    this.isTabletVisible = false;
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.tabletRead'), id: 'system_tabletRead' });
  }

  closeFlipchart(): void {
    this.isFlipchartVisible = false;
    this.goBack();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundFlipchart'), id: 'system_foundFlipchart' });
  }

  toggleTablet(): void {
    if (this.hasFoundTablet) {
      this.playSound('paper-rustle.wav');
      this.isTabletVisible = !this.isTabletVisible;
      this.isFlipchartVisible = false;
    }
  }

  toggleFlipchart(): void {
    if (this.hasFoundFlipchart) {
      this.playSound('paper-rustle.wav');
      this.isFlipchartVisible = !this.isFlipchartVisible;
      this.isTabletVisible = false;
    }
  }

  // --- Puzzle 1: Fill-in-the-Gap (2 blanks) ---

  fillGap(word: string): void {
    this.fillGapSlot(this.userGapAnswers, word);
  }

  resetGap(): void {
    this.userGapAnswers = this.resetGapSlots(2) as string[];
  }

  submitGap(): void {
    const correct = [
      this.t('puzzles.fillGap.correctAnswers.0'),
      this.t('puzzles.fillGap.correctAnswers.1')
    ];

    if (JSON.stringify(this.userGapAnswers) === JSON.stringify(correct)) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.gapWrongAttempts = 0;
      this.recordPuzzleScore('Fill the Gap', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
      setTimeout(() => {
        this.currentState = GameState.Puzzle1Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.fillGap.feedback.correct'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.gapWrongAttempts++;
      this.puzzle1TotalWrong++;

      if (this.gapWrongAttempts >= 3) {
        this.puzzle1WasRevealed = true;
        this.userGapAnswers = [...correct];
        this.answerOverlayText = this.t('puzzles.fillGap.answerOverlay');
        this.answerOverlayCallback = () => {
          this.gapWrongAttempts = 0;
          this.recordPuzzleScore('Fill the Gap', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
          setTimeout(() => {
        this.currentState = GameState.Puzzle1Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.fillGap.feedback.correct'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.fillGap.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Puzzle 2: Single Choice ---

  submitPuzzle2(option: { id: string; text: string; correct: boolean }): void {
    if (option.correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.recordPuzzleScore('Single Choice', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
      setTimeout(() => {
        this.initSequenceOrder();
        this.currentState = GameState.Puzzle2Complete;
        this.currentState = GameState.Puzzle3_SequenceOrder;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice.feedback.correct'), id: 'system_puzzle2Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.puzzle2WrongAttempts++;
      this.puzzle2TotalWrong++;

      if (this.puzzle2WrongAttempts >= 3) {
        this.puzzle2WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.singleChoice.answerOverlay');
        this.answerOverlayCallback = () => {
          this.puzzle2WrongAttempts = 0;
          this.recordPuzzleScore('Single Choice', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
          setTimeout(() => {
        this.initSequenceOrder();
        this.currentState = GameState.Puzzle2Complete;
        this.currentState = GameState.Puzzle3_SequenceOrder;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice.feedback.correct'), id: 'system_puzzle2Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.singleChoice.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Puzzle 3: Sequence Ordering ---

  onDrop(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.userSequence, event.previousIndex, event.currentIndex);
  }

  skipPuzzle1(): void {
    this.recordPuzzleScore('Fill the Gap', 99, true);
    this.puzzleFeedback = '';
    this.userGapAnswers = [null!, null!];
    this.gapWrongAttempts = 0;
    this.currentState = GameState.Puzzle1Complete;
    this.updateBackground();
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Single Choice', 99, true);
    this.puzzleFeedback = '';
    this.puzzle2WrongAttempts = 0;
    this.initSequenceOrder();
    this.currentState = GameState.Puzzle3_SequenceOrder;
    this.updateBackground();
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Sequence Order', 99, true);
    this.puzzleFeedback = '';
    this.puzzle3WrongAttempts = 0;
    this.currentView = 'main';
    this.currentState = GameState.Reveal;
    this.updateBackground();
    const mariaName = this.t('characters.maria.name');
    this.showDialogue({ character: mariaName, text: this.t('characters.maria.dialogues.finalWords'), id: 'maria_finalWords' });
  }

  submitSequence(): void {
    const correct = [
      this.t('puzzles.sequenceOrder.correctOrder.0'),
      this.t('puzzles.sequenceOrder.correctOrder.1'),
      this.t('puzzles.sequenceOrder.correctOrder.2'),
      this.t('puzzles.sequenceOrder.correctOrder.3')
    ];

    if (JSON.stringify(this.userSequence) === JSON.stringify(correct)) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.recordPuzzleScore('Sequence Order', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
      setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Reveal;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.sequenceOrder.feedback.correct'), id: 'system_puzzle3Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.puzzle3WrongAttempts++;
      this.puzzle3TotalWrong++;

      if (this.puzzle3WrongAttempts >= 3) {
        this.puzzle3WasRevealed = true;
        this.userSequence = [...correct];
        this.answerOverlayText = this.t('puzzles.sequenceOrder.answerOverlay');
        this.answerOverlayCallback = () => {
          this.puzzle3WrongAttempts = 0;
          this.recordPuzzleScore('Sequence Order', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
          setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Reveal;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.sequenceOrder.feedback.correct'), id: 'system_puzzle3Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.sequenceOrder.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }
}

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
  TalkToElena1,
  FindStickyNote,
  ReadStickyNote,
  TalkToElena2,
  Puzzle1_TrueFalse,
  Puzzle1Complete,
  FindPaper,
  ReadPaper,
  TalkToElena3,
  Puzzle2_SingleChoice,
  Puzzle2Complete,
  Puzzle3_SequenceOrder,
  Reveal,
  Completion
}

const imagePaths = {
  base_empty: '/assets/images/flexibility/rnd_room.png',
  base: '/assets/images/flexibility/rnd_room_default.png',
  base_door_open: '/assets/images/flexibility/rnd_room_door_open.png',
  elena_hover: '/assets/images/flexibility/elena_hover.png',
  elena_talking: '/assets/images/flexibility/elena_talking.png',
  elena_hover_door_open: '/assets/images/flexibility/elena_hover_door_open.png',
  marco_hover: '/assets/images/flexibility/marco_hover.png',
  marco_talking: '/assets/images/flexibility/marco_talking.png',
  marco_hover_door_open: '/assets/images/flexibility/marco_hover_door_open.png',
  zoom_table: '/assets/images/flexibility/zoom_table.png',
  zoom_trashbin: '/assets/images/flexibility/zoom_trashbin.png',
  sticky_note: '/assets/images/flexibility/sticky_note.png',
  paper: '/assets/images/flexibility/paper.png',
};

type ViewState = 'main' | 'table' | 'trashbin';

const roomConfig: EscapeRoomConfig = {
  roomId: 'flexibility',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
    selector: 'app-flexibility-skill23',
    templateUrl: './flexibility-skill23.component.html',
    styleUrl: './flexibility-skill23.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule, DragDropModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class FlexibilitySkill23Component extends EscapeRoomBaseComponent {

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
  isStickyNoteVisible: boolean = false;
  isPaperVisible: boolean = false;

  // Item found flags
  hasFoundStickyNote: boolean = false;
  hasFoundPaper: boolean = false;

  // Track coffee cup click (first click laptop, then coffee cup)
  hasClickedLaptop: boolean = false;

  hotspots = {
    main: {
      elena: { x: 20, y: 32, width: 9, height: 46 },
      marco: { x: 56, y: 30, width: 24, height: 58 },
      table: { x: 20, y: 52, width: 58, height: 42 },
      coffeeCup: { x: 44, y: 77, width: 8, height: 12 },
      trashbin: { x: 12, y: 65, width: 10, height: 25 },
      whiteboard: { x: 23, y: 28, width: 35, height: 28 },
      exitDoor: { x: 62, y: 18, width: 12, height: 47 },
    },
    table_zoom: {
      stickyNote: { x: 44, y: 83, width: 12, height: 12 },
    },
    trashbin_zoom: {
      paper: { x: 43, y: 33, width: 30, height: 20 },
    }
  };

  // --- Puzzle 1: True/False (3 questions) ---
  currentTFQuestion: number = 0;
  tfWrongAttempts: number = 0;
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
      elena: { hover: imagePaths.elena_hover, hoverDoorOpen: imagePaths.elena_hover_door_open },
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
    return this.currentState === GameState.Puzzle1_TrueFalse ||
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
    if (this.isQuizActive) { this.currentBackgroundUrl = imagePaths.elena_talking; return; }
    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }
    switch (this.currentView) {
      case 'table': this.currentBackgroundUrl = imagePaths.zoom_table; break;
      case 'trashbin': this.currentBackgroundUrl = imagePaths.zoom_trashbin; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  protected override onHintRequested(): void { this.isHintDialogue = true; }

  protected override getHintText(): string {
    if (this.currentState === GameState.TalkToElena1) return this.t('hints.talkToElena');
    if (this.currentState === GameState.FindStickyNote) return this.t('hints.findStickyNote');
    if (this.currentState === GameState.TalkToElena2) return this.t('hints.talkToElena2');
    if (this.currentState === GameState.Puzzle1_TrueFalse) return this.t('hints.puzzle1');
    if (this.currentState === GameState.Puzzle1Complete) return this.t('hints.puzzle1Complete');
    if (this.currentState === GameState.FindPaper) return this.t('hints.findPaper');
    if (this.currentState === GameState.TalkToElena3) return this.t('hints.talkToElena3');
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

    if (target === 'elena') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.elena_talking;
      this.handleElenaInteraction();
      return;
    }

    if (target === 'marco') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.marco_talking;
      const name = this.t('characters.marco.name');
      this.showDialogue({ character: name, text: this.t('characters.marco.dialogues.busy'), id: 'marco_busy' });
      return;
    }

    if (this.currentView === 'main') {
      // Table/laptop click during FindStickyNote
      if (target === 'table' && this.currentState === GameState.FindStickyNote && !this.hasClickedLaptop) {
        this.hasClickedLaptop = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickLaptop'), id: 'system_clickLaptop' });
        return;
      }

      // Coffee cup click after laptop → zoom to table, player finds sticky note
      if ((target === 'coffeeCup' || (target === 'table' && this.hasClickedLaptop)) && this.currentState === GameState.FindStickyNote) {
        this.zoomToLocation('table', this.hotspots.main, () => {
          this.currentView = 'table';
          this.updateBackground();
          this.resetZoom(true);
          // Player must click on the sticky note within the zoomed view
        }, 2.5);
        return;
      }

      // Whiteboard click during FindPaper (wrong spot)
      if (target === 'whiteboard' && this.currentState === GameState.FindPaper) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickWhiteboard'), id: 'system_clickWhiteboard' });
        return;
      }

      // Trash bin click during FindPaper → zoom, player finds paper
      if (target === 'trashbin' && this.currentState === GameState.FindPaper) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'trashbin';
          this.updateBackground();
          this.resetZoom(true);
          // Player must click on the paper within the zoomed view
        }, 2.5);
        return;
      }
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'table' && target === 'stickyNote' && this.currentState === GameState.FindStickyNote) {
      this.playSound('success-chime.wav');
      this.hasFoundStickyNote = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundStickyNote'), id: 'system_foundStickyNote' });
      return;
    }

    if (this.currentView === 'trashbin' && target === 'paper' && this.currentState === GameState.FindPaper) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundPaper = true;
      this.isPaperVisible = true;
      return;
    }
  }

  handleElenaInteraction(): void {
    const name = this.t('characters.elena.name');
    if (this.currentState === GameState.TalkToElena1) {
      this.showDialogue({ character: name, text: this.t('characters.elena.dialogues.greet'), id: 'elena_greet' });
    } else if (this.currentState === GameState.TalkToElena2) {
      this.showDialogue({ character: name, text: this.t('characters.elena.dialogues.stickyNoteFound'), id: 'elena_stickyNoteFound' });
    } else if (this.currentState === GameState.Puzzle1Complete) {
      this.showDialogue({ character: name, text: this.t('characters.elena.dialogues.quiz1Done'), id: 'elena_quiz1Done' });
    } else if (this.currentState === GameState.TalkToElena3) {
      this.showDialogue({ character: name, text: this.t('characters.elena.dialogues.paperFound'), id: 'elena_paperFound' });
    } else if (this.currentState === GameState.Completion) {
      this.showDialogue({ character: name, text: this.t('characters.elena.dialogues.completion'), id: 'elena_completion' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.elena.dialogues.default'), id: 'elena_default' });
    }
  }

  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;
    this.updateBackground();

    if (this.isHintDialogue) { this.isHintDialogue = false; this.showHintPulse(); }
    else { this.showHints = false; }

    const elenaName = this.t('characters.elena.name');

    if (this.currentView !== 'main' && !['system_foundStickyNote'].includes(id || '')) {
      this.currentView = 'main';
    }

    if (id === 'system_selfTalk') { this.currentState = GameState.TalkToElena1; }
    else if (id === 'elena_greet') {
      this.showDialogue({ character: elenaName, text: this.t('characters.elena.dialogues.findStickyNote'), id: 'elena_findStickyNote' });
    }
    else if (id === 'elena_findStickyNote') { this.currentState = GameState.FindStickyNote; }
    else if (id === 'system_clickLaptop') { /* player should now click coffee cup */ }
    else if (id === 'system_foundStickyNote') {
      this.isStickyNoteVisible = true;
    }
    else if (id === 'system_stickyNoteRead') {
      this.currentView = 'main';
      this.currentState = GameState.TalkToElena2;
      this.updateBackground();
    }
    else if (id === 'elena_stickyNoteFound') {
      this.showDialogue({ character: elenaName, text: this.t('characters.elena.dialogues.quiz1Intro'), id: 'elena_quiz1Intro' });
    }
    else if (id === 'elena_quiz1Intro') {
      this.currentState = GameState.Puzzle1_TrueFalse;
      this.currentTFQuestion = 0;
      this.updateBackground();
    }
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'elena_quiz1Done') {
      this.showDialogue({ character: elenaName, text: this.t('characters.elena.dialogues.findPaper'), id: 'elena_findPaper' });
    }
    else if (id === 'elena_findPaper') { this.currentState = GameState.FindPaper; }
    else if (id === 'system_clickWhiteboard') { /* player should look for trash bin */ }
    else if (id === 'system_foundPaper') {
      this.currentState = GameState.TalkToElena3;
    }
    else if (id === 'elena_paperFound') {
      this.showDialogue({ character: elenaName, text: this.t('characters.elena.dialogues.puzzle2Intro'), id: 'elena_puzzle2Intro' });
    }
    else if (id === 'elena_puzzle2Intro') {
      this.currentState = GameState.Puzzle2_SingleChoice;
      this.updateBackground();
    }
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'system_puzzle3Complete') {
      // State already changed before dialogue was shown
      this.showDialogue({ character: elenaName, text: this.t('characters.elena.dialogues.finalWords'), id: 'elena_finalWords' });
    }
    else if (id === 'elena_finalWords') {
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

  closeStickyNote(): void {
    this.isStickyNoteVisible = false;
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.stickyNoteRead'), id: 'system_stickyNoteRead' });
  }

  closePaper(): void {
    this.isPaperVisible = false;
    this.goBack();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundPaper'), id: 'system_foundPaper' });
  }

  toggleStickyNote(): void {
    if (this.hasFoundStickyNote) {
      this.playSound('paper-rustle.wav');
      this.isStickyNoteVisible = !this.isStickyNoteVisible;
      this.isPaperVisible = false;
    }
  }

  togglePaper(): void {
    if (this.hasFoundPaper) {
      this.playSound('paper-rustle.wav');
      this.isPaperVisible = !this.isPaperVisible;
      this.isStickyNoteVisible = false;
    }
  }

  // --- Puzzle 1: True/False ---

  submitTrueFalse(answer: boolean): void {
    const questions = [false, true, false]; // correct answers for Q1, Q2, Q3
    const correct = questions[this.currentTFQuestion] === answer;

    if (correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.currentTFQuestion++;
      if (this.currentTFQuestion >= 3) {
        this.recordPuzzleScore('True/False', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
        setTimeout(() => {
        this.currentState = GameState.Puzzle1Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.trueFalse.feedback.correct'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
      }
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.tfWrongAttempts++;
      this.puzzle1TotalWrong++;

      // T/F: show correct answer briefly then auto-advance (no verbose hint for 2-option questions)
      this.puzzleFeedback = this.t('puzzles.trueFalse.feedback.wrong');

      setTimeout(() => {
        this.isPuzzleWrong = false;
        this.puzzleFeedback = '';
        this.currentTFQuestion++;
        if (this.currentTFQuestion >= 3) {
          this.recordPuzzleScore('True/False', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
          setTimeout(() => {
        this.currentState = GameState.Puzzle1Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.trueFalse.feedback.correct'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        }
      }, 1500);
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

  // --- Skip Puzzle Methods ---

  skipPuzzle1(): void {
    this.recordPuzzleScore('True/False', 99, true);
    this.currentState = GameState.Puzzle1Complete;
    this.puzzleFeedback = '';
    this.updateBackground();
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Single Choice', 99, true);
    this.currentState = GameState.Puzzle2Complete;
    this.initSequenceOrder();
    this.currentState = GameState.Puzzle3_SequenceOrder;
    this.puzzleFeedback = '';
    this.updateBackground();
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Sequence Order', 99, true);
    this.currentView = 'main';
    this.currentState = GameState.Reveal;
    this.puzzleFeedback = '';
    this.updateBackground();
    const elenaName = this.t('characters.elena.name');
    this.showDialogue({ character: elenaName, text: this.t('characters.elena.dialogues.finalWords'), id: 'elena_finalWords' });
  }

  // --- Puzzle 3: Sequence Ordering ---

  onDrop(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.userSequence, event.previousIndex, event.currentIndex);
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

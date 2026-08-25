import { Component, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
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

enum GameState {
  Intro,
  TalkToAmina1,
  FindStickyNote,
  ReadStickyNote,
  TalkToDavid1,
  Puzzle1_TrueFalse,
  Puzzle1Complete,
  FindPaper,
  ReadPaper,
  TalkToDavid2,
  Puzzle2_SingleChoice,
  Puzzle2Complete,
  Puzzle3_SequenceOrder,
  Reveal,
  Completion
}

const imagePaths = {
  base_empty: '/assets/images/self_reliance/rooftop.png',
  base: '/assets/images/self_reliance/rooftop_default.png',
  base_door_open: '/assets/images/self_reliance/rooftop_door_open.png',
  amina_hover: '/assets/images/self_reliance/amina_hover.png',
  amina_talking: '/assets/images/self_reliance/amina_talking.png',
  amina_hover_door_open: '/assets/images/self_reliance/amina_hover_door_open.png',
  david_hover: '/assets/images/self_reliance/david_hover.png',
  david_talking: '/assets/images/self_reliance/david_talking.png',
  david_hover_door_open: '/assets/images/self_reliance/david_hover_door_open.png',
  zoom_table: '/assets/images/self_reliance/zoom_table.png',
  zoom_plant: '/assets/images/self_reliance/zoom_plant.png',
  sticky_note: '/assets/images/self_reliance/sticky_note.png',
  paper: '/assets/images/self_reliance/paper.png',
};

type ViewState = 'main' | 'table' | 'plant' | 'david_area';

const roomConfig: EscapeRoomConfig = {
  roomId: 'self-reliance',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
  selector: 'app-self-reliance-skill28',
  templateUrl: './self-reliance-skill28.component.html',
  styleUrl: './self-reliance-skill28.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule, DragDropModule],
  animations: [fadeInOut]
})
export class SelfRelianceSkill28Component extends EscapeRoomBaseComponent {

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

  // Quest 1: Find sticky note — track location clicks
  hasClickedConferenceTable: boolean = false;
  hasClickedPlant: boolean = false;

  // Quest 2: Find paper — track location clicks
  hasClickedDesk: boolean = false;
  hasClickedConferenceDoor2: boolean = false;

  hotspots = {
    main: {
      amina: { x: 54, y: 33, width: 19, height: 59 },
      david: { x: 73, y: 8, width: 19, height: 91 },
      table: { x: 28, y: 50, width: 30, height: 40 },
      conferenceDoor: { x: 78, y: 0, width: 20, height: 50 },
      plant: { x: 0, y: 54, width: 12, height: 45 },
      desk: { x: 37, y: 53, width: 26, height: 37 },
      exitDoor: { x: 78, y: 0, width: 20, height: 55 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    table_zoom: {
      stickyNote: { x: 61, y: 65, width: 9, height: 5 },
    },
    david_zoom: {
      paper: { x: 55, y: 65, width: 25, height: 25 },
    }
  };

  // --- Puzzle 1: True/False (5 questions) ---
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
      amina: { hover: imagePaths.amina_hover, hoverDoorOpen: imagePaths.amina_hover_door_open },
      david: { hover: imagePaths.david_hover, hoverDoorOpen: imagePaths.david_hover_door_open },
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
    if (this.isQuizActive) { this.currentBackgroundUrl = imagePaths.david_talking; return; }
    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }
    switch (this.currentView) {
      case 'table': this.currentBackgroundUrl = imagePaths.zoom_table; break;
      case 'plant': this.currentBackgroundUrl = imagePaths.zoom_plant; break;
      case 'david_area': this.currentBackgroundUrl = imagePaths.david_talking; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  protected override onHintRequested(): void { this.isHintDialogue = true; }

  protected override getHintText(): string {
    if (this.currentState === GameState.TalkToAmina1) return this.t('hints.talkToAmina');
    if (this.currentState === GameState.FindStickyNote) return this.t('hints.findStickyNote');
    if (this.currentState === GameState.TalkToDavid1) return this.t('hints.talkToDavid');
    if (this.currentState === GameState.Puzzle1_TrueFalse) return this.t('hints.puzzle1TrueFalse');
    if (this.currentState === GameState.Puzzle1Complete) return this.t('hints.talkToDavid');
    if (this.currentState === GameState.FindPaper) return this.t('hints.findPaper');
    if (this.currentState === GameState.TalkToDavid2) return this.t('hints.talkToDavid2');
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

    if (target === 'amina') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.amina_talking;
      this.handleAminaInteraction();
      return;
    }

    if (target === 'david') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.david_talking;
      this.handleDavidInteraction();
      return;
    }

    if (this.currentView === 'main') {
      // Quest 1: Find sticky note — 3 locations: conferenceDoor → plant → table
      if (target === 'conferenceDoor' && this.currentState === GameState.FindStickyNote && !this.hasClickedConferenceTable) {
        this.hasClickedConferenceTable = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickConferenceTable'), id: 'system_clickConferenceTable' });
        return;
      }

      if (target === 'plant' && this.currentState === GameState.FindStickyNote && this.hasClickedConferenceTable && !this.hasClickedPlant) {
        this.hasClickedPlant = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickPlant'), id: 'system_clickPlant' });
        return;
      }

      if (target === 'table' && this.currentState === GameState.FindStickyNote && this.hasClickedPlant) {
        this.zoomToLocation('table', this.hotspots.main, () => {
          this.currentView = 'table';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on sticky note within zoomed view
        }, 2.5);
        return;
      }

      // Quest 2: Find paper — 3 locations: desk → conferenceDoor → david's pocket
      if (target === 'desk' && this.currentState === GameState.FindPaper && !this.hasClickedDesk) {
        this.hasClickedDesk = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickDesk'), id: 'system_clickDesk' });
        return;
      }

      if (target === 'conferenceDoor' && this.currentState === GameState.FindPaper && this.hasClickedDesk && !this.hasClickedConferenceDoor2) {
        this.hasClickedConferenceDoor2 = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickConferenceDoor2'), id: 'system_clickConferenceDoor2' });
        return;
      }

      if (target === 'david' && this.currentState === GameState.FindPaper && this.hasClickedConferenceDoor2) {
        // Zoom to David area — player must click on paper in zoomed view
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'david_area';
          this.updateBackground();
          this.resetZoom(true);
        }, 2.5);
        return;
      }
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'david_area' && target === 'paper' && this.currentState === GameState.FindPaper) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundPaper = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundPaper'), id: 'system_foundPaper' });
      return;
    }

    if (this.currentView === 'table' && target === 'stickyNote' && this.currentState === GameState.FindStickyNote) {
      this.playSound('success-chime.wav');
      this.hasFoundStickyNote = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundStickyNote'), id: 'system_foundStickyNote' });
      return;
    }
  }

  handleAminaInteraction(): void {
    const name = this.t('characters.amina.name');
    if (this.currentState === GameState.TalkToAmina1) {
      this.showDialogue({ character: name, text: this.t('characters.amina.dialogues.greet'), id: 'amina_greet' });
    } else if (this.currentState === GameState.Completion) {
      this.showDialogue({ character: name, text: this.t('characters.amina.dialogues.completion'), id: 'amina_completion' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.amina.dialogues.default'), id: 'amina_default' });
    }
  }

  handleDavidInteraction(): void {
    const name = this.t('characters.david.name');
    if (this.currentState === GameState.TalkToDavid1) {
      this.showDialogue({ character: name, text: this.t('characters.amina.dialogues.stickyNoteFound'), id: 'david_stickyNoteFound' });
    } else if (this.currentState === GameState.Puzzle1Complete) {
      this.showDialogue({ character: name, text: this.t('characters.amina.dialogues.quiz1Done'), id: 'david_quiz1Done' });
    } else if (this.currentState === GameState.FindPaper && this.hasClickedConferenceDoor2) {
      // Zoom to David area — player must click on paper in zoomed view
      this.zoomToLocation('david', this.hotspots.main, () => {
        this.currentView = 'david_area';
        this.updateBackground();
        this.resetZoom(true);
      }, 2.5);
    } else if (this.currentState === GameState.TalkToDavid2) {
      this.showDialogue({ character: name, text: this.t('characters.amina.dialogues.paperFound'), id: 'david_paperFound' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.david.dialogues.busy'), id: 'david_busy' });
    }
  }

  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;
    this.updateBackground();

    if (this.isHintDialogue) { this.isHintDialogue = false; this.showHintPulse(); }
    else { this.showHints = false; }

    const aminaName = this.t('characters.amina.name');
    const davidName = this.t('characters.david.name');

    if (this.currentView !== 'main' && !['system_foundStickyNote'].includes(id || '')) {
      this.currentView = 'main';
    }

    if (id === 'system_selfTalk') { this.currentState = GameState.TalkToAmina1; }
    else if (id === 'amina_greet') {
      this.showDialogue({ character: aminaName, text: this.t('characters.amina.dialogues.stressful'), id: 'amina_stressful' });
    }
    else if (id === 'amina_stressful') {
      this.showDialogue({ character: aminaName, text: this.t('characters.amina.dialogues.findStickyNote'), id: 'amina_findStickyNote' });
    }
    else if (id === 'amina_findStickyNote') { this.currentState = GameState.FindStickyNote; }
    else if (id === 'system_clickConferenceTable') { /* player should now click plant */ }
    else if (id === 'system_clickPlant') { /* player should now click table */ }
    else if (id === 'system_foundStickyNote') {
      this.isStickyNoteVisible = true;
    }
    else if (id === 'system_stickyNoteRead') {
      this.currentView = 'main';
      this.currentState = GameState.TalkToDavid1;
      this.updateBackground();
    }
    else if (id === 'david_stickyNoteFound') {
      this.showDialogue({ character: davidName, text: this.t('characters.amina.dialogues.quiz1Intro'), id: 'david_quiz1Intro' });
    }
    else if (id === 'david_quiz1Intro') {
      this.currentState = GameState.Puzzle1_TrueFalse;
      this.currentTFQuestion = 0;
      this.updateBackground();
    }
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'david_quiz1Done') {
      this.showDialogue({ character: davidName, text: this.t('characters.amina.dialogues.findPaper'), id: 'david_findPaper' });
    }
    else if (id === 'david_findPaper') { this.currentState = GameState.FindPaper; }
    else if (id === 'system_clickDesk') { /* player should check conference door */ }
    else if (id === 'system_clickConferenceDoor2') { /* player should click David */ }
    else if (id === 'system_foundPaper') {
      this.isPaperVisible = true;
    }
    else if (id === 'system_paperRead') {
      this.currentState = GameState.TalkToDavid2;
      this.updateBackground();
    }
    else if (id === 'david_paperFound') {
      this.showDialogue({ character: davidName, text: this.t('characters.amina.dialogues.puzzle2Intro'), id: 'david_puzzle2Intro' });
    }
    else if (id === 'david_puzzle2Intro') {
      this.currentState = GameState.Puzzle2_SingleChoice;
      this.updateBackground();
    }
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'system_puzzle3Complete') {
      // State already changed before dialogue was shown
      this.showDialogue({ character: davidName, text: this.t('characters.amina.dialogues.finalWords'), id: 'david_finalWords' });
    }
    else if (id === 'david_finalWords') {
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
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundPaper'), id: 'system_paperRead' });
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

  skipPuzzle1(): void {
    this.recordPuzzleScore('True/False', 99, true);
    this.puzzleFeedback = '';
    this.currentTFQuestion = 5;
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
    const davidName = this.t('characters.david.name');
    this.showDialogue({ character: davidName, text: this.t('characters.amina.dialogues.finalWords'), id: 'david_finalWords' });
  }

  // --- Puzzle 1: True/False (5 questions) ---

  submitTrueFalse(answer: boolean): void {
    const questions = [true, false, true, false, true]; // correct answers for Q1-Q5
    const correct = questions[this.currentTFQuestion] === answer;

    if (correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.currentTFQuestion++;
      if (this.currentTFQuestion >= 5) {
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
      this.puzzle1TotalWrong++;

      // T/F: show correct answer briefly then auto-advance
      this.puzzleFeedback = this.t('puzzles.trueFalse.feedback.wrong');

      setTimeout(() => {
        this.isPuzzleWrong = false;
        this.puzzleFeedback = '';
        this.currentTFQuestion++;
        if (this.currentTFQuestion >= 5) {
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

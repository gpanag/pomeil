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
  TalkToSarah1,
  FindDocument,
  ReadDocument,
  TalkToSarah2,
  Puzzle1_Matching,
  Puzzle1Complete,
  FindEmail,
  ReadEmail,
  TalkToSarah3,
  Puzzle2_SequenceOrder,
  Puzzle2Complete,
  Puzzle3_SingleChoice,
  Reveal,
  Completion
}

const imagePaths = {
  base_empty: '/assets/images/legal_compliance/legal_dept.png',
  base: '/assets/images/legal_compliance/legal_dept_default.png',
  base_door_open: '/assets/images/legal_compliance/legal_dept_door_open.png',
  sarah_hover: '/assets/images/legal_compliance/sarah_hover.png',
  sarah_talking: '/assets/images/legal_compliance/sarah_talking.png',
  sarah_hover_door_open: '/assets/images/legal_compliance/sarah_hover_door_open.png',
  david_hover: '/assets/images/legal_compliance/david_hover.png',
  david_talking: '/assets/images/legal_compliance/david_talking.png',
  david_hover_door_open: '/assets/images/legal_compliance/david_hover_door_open.png',
  zoom_cabinet: '/assets/images/legal_compliance/zoom_cabinet_closed.png',
  zoom_cabinet_open: '/assets/images/legal_compliance/zoom_cabinet_open.png',
  zoom_bookshelf: '/assets/images/legal_compliance/zoom_bookshelf.png',
  document: '/assets/images/legal_compliance/document.png',
  email: '/assets/images/legal_compliance/email.png',
};

type ViewState = 'main' | 'cabinet' | 'bookshelf';

const roomConfig: EscapeRoomConfig = {
  roomId: 'legal-compliance',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
  selector: 'app-legal-compliance-skill20',
  templateUrl: './legal-compliance-skill20.component.html',
  styleUrl: './legal-compliance-skill20.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule, DragDropModule],
  animations: [fadeInOut]
})
export class LegalComplianceSkill20Component extends EscapeRoomBaseComponent {

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
  isDocumentVisible: boolean = false;
  isEmailVisible: boolean = false;

  // Item found flags
  hasFoundDocument: boolean = false;
  hasFoundEmail: boolean = false;

  // Track desk click (first click desk, then cabinet)
  hasClickedDesk: boolean = false;
  isCabinetOpen: boolean = false;

  hotspots = {
    main: {
      sarah: { x: 37, y: 36, width: 17, height: 30 },
      david: { x: 78, y: 37, width: 21, height: 59 },
      cabinet: { x: 75, y: 49, width: 12, height: 10 },
      desk: { x: 4, y: 60, width: 68, height: 39 },
      bookshelf: { x: 45, y: 5, width: 30, height: 55 },
      scales: { x: 12, y: 42, width: 8, height: 10 },
      exitDoor: { x: 85, y: 2, width: 12, height: 65 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    cabinet_zoom: {
      document: { x: 23, y: 61, width: 53, height: 33 },
    },
    bookshelf_zoom: {
      email: { x: 20, y: 50, width: 14, height: 20 },
    }
  };

  // --- Puzzle 1: Matching (Document Classification) ---
  matchingPairs: { [docId: string]: string } = {};
  selectedMatchLeft: string | null = null;
  puzzle1WrongAttempts: number = 0;
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;

  get matchingLeftItems(): { id: string; text: string }[] {
    return [
      { id: 'doc1', text: this.t('puzzles.matching.leftItems.0.text') },
      { id: 'doc2', text: this.t('puzzles.matching.leftItems.1.text') },
      { id: 'doc3', text: this.t('puzzles.matching.leftItems.2.text') },
      { id: 'doc4', text: this.t('puzzles.matching.leftItems.3.text') }
    ];
  }

  get matchingRightItems(): { id: string; text: string }[] {
    return [
      { id: 'cat1', text: this.t('puzzles.matching.rightItems.0.text') },
      { id: 'cat2', text: this.t('puzzles.matching.rightItems.1.text') },
      { id: 'cat3', text: this.t('puzzles.matching.rightItems.2.text') }
    ];
  }

  getCategoryText(catId: string): string {
    return this.matchingRightItems.find(r => r.id === catId)?.text || '';
  }

  get matchingRows(): { id: string; leftId: string; leftText: string; rightId: string; rightText: string }[] {
    return this.matchingLeftItems.map(left => {
      const pairedRight = this.matchingPairs[left.id];
      const right = pairedRight ? this.matchingRightItems.find(r => r.id === pairedRight) : null;
      return {
        id: left.id,
        leftId: left.id,
        leftText: left.text,
        rightId: right?.id || '',
        rightText: right?.text || '—'
      };
    });
  }

  // --- Puzzle 2: Sequence Ordering ---
  userSequence: string[] = [];
  puzzle2WrongAttempts: number = 0;
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;

  // --- Puzzle 3: Single Choice (Red Flag Detection) ---
  get puzzle3Options() {
    return [
      { id: 'a', text: this.t('puzzles.singleChoice.options.a'), correct: false },
      { id: 'b', text: this.t('puzzles.singleChoice.options.b'), correct: true },
      { id: 'c', text: this.t('puzzles.singleChoice.options.c'), correct: false },
      { id: 'd', text: this.t('puzzles.singleChoice.options.d'), correct: false }
    ];
  }
  puzzle3WrongAttempts: number = 0;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  override get characterImages(): CharacterImageMap {
    return {
      sarah: { hover: imagePaths.sarah_hover, hoverDoorOpen: imagePaths.sarah_hover_door_open },
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
    return this.currentState === GameState.Puzzle1_Matching ||
      this.currentState === GameState.Puzzle2_SequenceOrder ||
      this.currentState === GameState.Puzzle3_SingleChoice;
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
    if (this.isQuizActive) { this.currentBackgroundUrl = imagePaths.sarah_talking; return; }
    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }
    switch (this.currentView) {
      case 'cabinet': this.currentBackgroundUrl = this.isCabinetOpen ? imagePaths.zoom_cabinet_open : imagePaths.zoom_cabinet; break;
      case 'bookshelf': this.currentBackgroundUrl = imagePaths.zoom_bookshelf; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  protected override onHintRequested(): void { this.isHintDialogue = true; }

  protected override getHintText(): string {
    if (this.currentState === GameState.TalkToSarah1) return this.t('hints.talkToSarah');
    if (this.currentState === GameState.FindDocument) return this.t('hints.findDocument');
    if (this.currentState === GameState.TalkToSarah2) return this.t('hints.talkToSarah2');
    if (this.currentState === GameState.Puzzle1_Matching) return this.t('hints.puzzle1Matching');
    if (this.currentState === GameState.Puzzle1Complete) return this.t('hints.talkToSarah2');
    if (this.currentState === GameState.FindEmail) return this.t('hints.findEmail');
    if (this.currentState === GameState.TalkToSarah3) return this.t('hints.talkToSarah3');
    if (this.currentState === GameState.Puzzle2_SequenceOrder) return this.t('hints.puzzle2SequenceOrder');
    if (this.currentState === GameState.Puzzle3_SingleChoice) return this.t('hints.puzzle3SingleChoice');
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

    if (target === 'sarah') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.sarah_talking;
      this.handleSarahInteraction();
      return;
    }

    if (target === 'david') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.david_talking;
      const name = this.t('characters.david.name');
      this.showDialogue({ character: name, text: this.t('characters.david.dialogues.busy'), id: 'david_busy' });
      return;
    }

    if (this.currentView === 'main') {
      // Desk click during FindDocument (wrong spot first)
      if (target === 'desk' && this.currentState === GameState.FindDocument && !this.hasClickedDesk) {
        this.hasClickedDesk = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickDesk'), id: 'system_clickDesk' });
        return;
      }

      // Cabinet click during FindDocument — zoom in, player must click document inside
      if ((target === 'cabinet' || (target === 'desk' && this.hasClickedDesk)) && this.currentState === GameState.FindDocument) {
        this.zoomToLocation('cabinet', this.hotspots.main, () => {
          this.currentView = 'cabinet';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on document within zoomed view
        }, 2.5);
        return;
      }

      // Scales click during FindEmail (wrong spot)
      if (target === 'scales' && this.currentState === GameState.FindEmail) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.scales'), id: 'system_clickScales' });
        return;
      }

      // Bookshelf click during FindEmail — zoom in, player must click email inside
      if (target === 'bookshelf' && this.currentState === GameState.FindEmail) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'bookshelf';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on email within zoomed view
        }, 2.5);
        return;
      }
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'cabinet' && target === 'document' && this.currentState === GameState.FindDocument) {
      if (!this.isCabinetOpen) {
        this.isCabinetOpen = true;
        this.playSound('paper-rustle.wav');
        this.updateBackground();
        return;
      }
      this.playSound('success-chime.wav');
      this.hasFoundDocument = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundDocument'), id: 'system_foundDocument' });
      return;
    }

    if (this.currentView === 'bookshelf' && target === 'email' && this.currentState === GameState.FindEmail) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundEmail = true;
      this.isEmailVisible = true;
      return;
    }
  }

  handleSarahInteraction(): void {
    const name = this.t('characters.sarah.name');
    if (this.currentState === GameState.TalkToSarah1) {
      this.showDialogue({ character: name, text: this.t('characters.sarah.dialogues.greet'), id: 'sarah_greet' });
    } else if (this.currentState === GameState.TalkToSarah2) {
      this.showDialogue({ character: name, text: this.t('characters.sarah.dialogues.documentFound'), id: 'sarah_documentFound' });
    } else if (this.currentState === GameState.Puzzle1Complete) {
      this.showDialogue({ character: name, text: this.t('characters.sarah.dialogues.quiz1Done'), id: 'sarah_quiz1Done' });
    } else if (this.currentState === GameState.TalkToSarah3) {
      this.showDialogue({ character: name, text: this.t('characters.sarah.dialogues.emailFound'), id: 'sarah_emailFound' });
    } else if (this.currentState === GameState.Completion) {
      this.showDialogue({ character: name, text: this.t('characters.sarah.dialogues.completion'), id: 'sarah_completion' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.sarah.dialogues.default'), id: 'sarah_default' });
    }
  }

  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;
    this.updateBackground();

    if (this.isHintDialogue) { this.isHintDialogue = false; this.showHintPulse(); }
    else { this.showHints = false; }

    const sarahName = this.t('characters.sarah.name');

    if (this.currentView !== 'main' && !['system_foundDocument'].includes(id || '')) {
      this.currentView = 'main';
    }

    if (id === 'system_selfTalk') { this.currentState = GameState.TalkToSarah1; }
    else if (id === 'sarah_greet') {
      this.showDialogue({ character: sarahName, text: this.t('characters.sarah.dialogues.findDocument'), id: 'sarah_findDocument' });
    }
    else if (id === 'sarah_findDocument') { this.currentState = GameState.FindDocument; }
    else if (id === 'system_clickDesk') { /* player should now click cabinet */ }
    else if (id === 'system_foundDocument') {
      this.isDocumentVisible = true;
    }
    else if (id === 'system_documentRead') {
      this.currentView = 'main';
      this.currentState = GameState.TalkToSarah2;
      this.updateBackground();
    }
    else if (id === 'sarah_documentFound') {
      this.showDialogue({ character: sarahName, text: this.t('characters.sarah.dialogues.quiz1Intro'), id: 'sarah_quiz1Intro' });
    }
    else if (id === 'sarah_quiz1Intro') {
      this.currentState = GameState.Puzzle1_Matching;
      this.matchingPairs = {};
      this.selectedMatchLeft = null;
      this.updateBackground();
    }
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'sarah_quiz1Done') {
      this.showDialogue({ character: sarahName, text: this.t('characters.sarah.dialogues.findEmail'), id: 'sarah_findEmail' });
    }
    else if (id === 'sarah_findEmail') { this.currentState = GameState.FindEmail; }
    else if (id === 'system_clickScales') { /* player should look for bookshelf */ }
    else if (id === 'system_foundEmail') {
      this.currentState = GameState.TalkToSarah3;
    }
    else if (id === 'sarah_emailFound') {
      this.showDialogue({ character: sarahName, text: this.t('characters.sarah.dialogues.puzzle2Intro'), id: 'sarah_puzzle2Intro' });
    }
    else if (id === 'sarah_puzzle2Intro') {
      this.initSequenceOrder();
      this.currentState = GameState.Puzzle2_SequenceOrder;
      this.updateBackground();
    }
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'system_puzzle3Complete') {
      // State already changed before dialogue was shown
      this.showDialogue({ character: sarahName, text: this.t('characters.sarah.dialogues.finalWords'), id: 'sarah_finalWords' });
    }
    else if (id === 'sarah_finalWords') {
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

  closeDocument(): void {
    this.isDocumentVisible = false;
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.documentRead'), id: 'system_documentRead' });
  }

  closeEmail(): void {
    this.isEmailVisible = false;
    this.goBack();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundEmail'), id: 'system_foundEmail' });
  }

  toggleDocument(): void {
    if (this.hasFoundDocument) {
      this.playSound('paper-rustle.wav');
      this.isDocumentVisible = !this.isDocumentVisible;
      this.isEmailVisible = false;
    }
  }

  toggleEmail(): void {
    if (this.hasFoundEmail) {
      this.playSound('paper-rustle.wav');
      this.isEmailVisible = !this.isEmailVisible;
      this.isDocumentVisible = false;
    }
  }

  // --- Puzzle 1: Matching (Document Classification) ---

  selectMatchLeft(docId: string): void {
    this.selectedMatchLeft = docId;
  }

  selectMatchRight(catId: string): void {
    if (this.selectedMatchLeft) {
      this.matchingPairs[this.selectedMatchLeft] = catId;
      this.selectedMatchLeft = null;
    }
  }

  submitMatching(): void {
    const correctPairs: { [key: string]: string } = {
      'doc1': 'cat1',
      'doc2': 'cat2',
      'doc3': 'cat3',
      'doc4': 'cat1'
    };

    const allCorrect = Object.keys(correctPairs).every(
      key => this.matchingPairs[key] === correctPairs[key]
    );

    if (allCorrect) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.recordPuzzleScore('Matching', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
      setTimeout(() => {
        this.currentState = GameState.Puzzle1Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.correct'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.puzzle1WrongAttempts++;
      this.puzzle1TotalWrong++;

      if (this.puzzle1WrongAttempts >= 3) {
        this.puzzle1WasRevealed = true;
        this.matchingPairs = { ...correctPairs };
        this.answerOverlayText = this.t('puzzles.matching.answerOverlay');
        this.answerOverlayCallback = () => {
          this.puzzle1WrongAttempts = 0;
          this.recordPuzzleScore('Matching', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
          setTimeout(() => {
        this.currentState = GameState.Puzzle1Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.correct'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.matching.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Skip Puzzle Methods ---

  skipPuzzle1(): void {
    this.recordPuzzleScore('Matching', 99, true);
    this.puzzleFeedback = '';
    this.matchingPairs = { 'doc1': 'cat1', 'doc2': 'cat2', 'doc3': 'cat3', 'doc4': 'cat1' };
    this.selectedMatchLeft = null;
    this.currentState = GameState.Puzzle1Complete;
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.correct'), id: 'system_puzzle1Complete' });
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Sequence Order', 99, true);
    this.puzzleFeedback = '';
    this.currentState = GameState.Puzzle3_SingleChoice;
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.sequenceOrder.feedback.correct'), id: 'system_puzzle2Complete' });
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Single Choice', 99, true);
    this.puzzleFeedback = '';
    this.currentView = 'main';
    this.currentState = GameState.Reveal;
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice.feedback.correct'), id: 'system_puzzle3Complete' });
  }

  // --- Puzzle 2: Sequence Ordering ---

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
      this.recordPuzzleScore('Sequence Order', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
      setTimeout(() => {
        this.currentState = GameState.Puzzle2Complete;
        this.currentState = GameState.Puzzle3_SingleChoice;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.sequenceOrder.feedback.correct'), id: 'system_puzzle2Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.puzzle2WrongAttempts++;
      this.puzzle2TotalWrong++;

      if (this.puzzle2WrongAttempts >= 3) {
        this.puzzle2WasRevealed = true;
        this.userSequence = [...correct];
        this.answerOverlayText = this.t('puzzles.sequenceOrder.answerOverlay');
        this.answerOverlayCallback = () => {
          this.puzzle2WrongAttempts = 0;
          this.recordPuzzleScore('Sequence Order', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
          setTimeout(() => {
        this.currentState = GameState.Puzzle2Complete;
        this.currentState = GameState.Puzzle3_SingleChoice;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.sequenceOrder.feedback.correct'), id: 'system_puzzle2Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.sequenceOrder.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Puzzle 3: Single Choice (Red Flag Detection) ---

  submitPuzzle3(option: { id: string; text: string; correct: boolean }): void {
    if (option.correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.recordPuzzleScore('Single Choice', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
      setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Reveal;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice.feedback.correct'), id: 'system_puzzle3Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.puzzle3WrongAttempts++;
      this.puzzle3TotalWrong++;

      if (this.puzzle3WrongAttempts >= 3) {
        this.puzzle3WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.singleChoice.answerOverlay');
        this.answerOverlayCallback = () => {
          this.puzzle3WrongAttempts = 0;
          this.recordPuzzleScore('Single Choice', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
          setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Reveal;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice.feedback.correct'), id: 'system_puzzle3Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.singleChoice.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }
}

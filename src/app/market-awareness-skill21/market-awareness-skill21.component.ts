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
  TalkToElena1,
  FindCard,
  ReadCard,
  TalkToElena2,
  Puzzle1_Matching,
  Puzzle1Complete,
  FindSwot,
  ReadSwot,
  TalkToElena3,
  Puzzle2_SingleChoice,
  Puzzle2Complete,
  Puzzle3_SequenceOrder,
  Reveal,
  Completion
}

const imagePaths = {
  base_empty: '/assets/images/market_awareness/marketing_office.png',
  base: '/assets/images/market_awareness/marketing_office_default.png',
  base_door_open: '/assets/images/market_awareness/marketing_office_door_open.png',
  elena_hover: '/assets/images/market_awareness/elena_hover.png',
  elena_talking: '/assets/images/market_awareness/elena_talking.png',
  elena_hover_door_open: '/assets/images/market_awareness/elena_hover_door_open.png',
  david_hover: '/assets/images/market_awareness/david_hover.png',
  david_talking: '/assets/images/market_awareness/david_talking.png',
  zoom_table: '/assets/images/market_awareness/zoom_table.png',
  zoom_david_desk: '/assets/images/market_awareness/zoom_david_desk.png',
  persona_card: '/assets/images/market_awareness/persona_card.png',
  swot_paper: '/assets/images/market_awareness/swot_paper.png',
};

type ViewState = 'main' | 'table' | 'david_desk';

const roomConfig: EscapeRoomConfig = {
  roomId: 'market-awareness',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
  selector: 'app-market-awareness-skill21',
  templateUrl: './market-awareness-skill21.component.html',
  styleUrl: './market-awareness-skill21.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule, DragDropModule],
  animations: [fadeInOut]
})
export class MarketAwarenessSkill21Component extends EscapeRoomBaseComponent {

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
  isPersonaCardVisible: boolean = false;
  isSwotPaperVisible: boolean = false;

  // Item found flags
  hasFoundPersonaCard: boolean = false;
  hasFoundSwotPaper: boolean = false;

  hotspots = {
    main: {
      elena: { x: 65, y: 20, width: 22, height: 60 },
      david: { x: 13, y: 38, width: 22, height: 42 },
      table: { x: 5, y: 54, width: 89, height: 45 },
      whiteboard: { x: 37, y: 30, width: 21, height: 19 },
      davidDesk: { x: 5, y: 54, width: 25, height: 20 },
      window: { x: 75, y: 2, width: 25, height: 50 },
      exitDoor: { x: 0, y: 8, width: 16, height: 70 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    table_zoom: {
      personaCard: { x: 55, y: 56, width: 23, height: 20 },
    },
    david_desk_zoom: {
      swotSheet: { x: 66, y: 75, width: 33, height: 15 },
    }
  };

  // --- Puzzle 1: Matching (4 pairs) ---
  // Correct: 1-B, 2-C, 3-A, 4-D
  get matchingPairs() {
    return [
      { id: '1', cue: this.t('puzzles.matching.columnA.items.1'), stateId: 'B' },
      { id: '2', cue: this.t('puzzles.matching.columnA.items.2'), stateId: 'C' },
      { id: '3', cue: this.t('puzzles.matching.columnA.items.3'), stateId: 'A' },
      { id: '4', cue: this.t('puzzles.matching.columnA.items.4'), stateId: 'D' }
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

  // --- Puzzle 2: Single Choice ---
  get puzzle2Options() {
    return [
      { id: 'a', text: this.t('puzzles.singleChoice.options.a'), correct: false },
      { id: 'b', text: this.t('puzzles.singleChoice.options.b'), correct: false },
      { id: 'c', text: this.t('puzzles.singleChoice.options.c'), correct: false },
      { id: 'd', text: this.t('puzzles.singleChoice.options.d'), correct: true }
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
      david: { hover: imagePaths.david_hover, hoverDoorOpen: imagePaths.david_hover },
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
      case 'david_desk': this.currentBackgroundUrl = imagePaths.zoom_david_desk; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  protected override onHintRequested(): void { this.isHintDialogue = true; }

  protected override getHintText(): string {
    if (this.currentState === GameState.TalkToElena1) return this.t('hints.talkToElena');
    if (this.currentState === GameState.FindCard) return this.t('hints.findCard');
    if (this.currentState === GameState.TalkToElena2) return this.t('hints.talkToElena2');
    if (this.currentState === GameState.Puzzle1_Matching) return this.t('puzzles.matching.hint');
    if (this.currentState === GameState.Puzzle1Complete) return this.t('hints.talkToElena2');
    if (this.currentState === GameState.FindSwot) return this.t('hints.findSwot');
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

    if (target === 'david') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.david_talking;
      const name = this.t('characters.david.name');
      this.showDialogue({ character: name, text: this.t('characters.david.dialogues.busy'), id: 'david_busy' });
      return;
    }

    if (this.currentView === 'main') {
      // Central table click during FindCard — zoom in, don't auto-give item
      if (target === 'table' && this.currentState === GameState.FindCard) {
        this.zoomToLocation('table', this.hotspots.main, () => {
          this.currentView = 'table';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on persona card within zoomed view
        }, 2.5);
        return;
      }

      // Whiteboard click during FindCard (wrong)
      if (target === 'whiteboard' && this.currentState === GameState.FindCard) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickWhiteboard'), id: 'system_clickWhiteboard' });
        return;
      }

      // David's desk click during FindCard (wrong)
      if (target === 'davidDesk' && this.currentState === GameState.FindCard) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickDavid'), id: 'system_clickDavid' });
        return;
      }

      // Window/shelves click during FindCard (wrong)
      if (target === 'window' && this.currentState === GameState.FindCard) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickWindow'), id: 'system_clickWindow' });
        return;
      }

      // David's desk click during FindSwot — zoom in, don't auto-give item
      if (target === 'davidDesk' && this.currentState === GameState.FindSwot) {
        this.zoomToLocation('davidDesk', this.hotspots.main, () => {
          this.currentView = 'david_desk';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on SWOT sheet within zoomed view
        }, 2.5);
        return;
      }
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'table' && target === 'personaCard' && this.currentState === GameState.FindCard) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundPersonaCard = true;
      this.isPersonaCardVisible = true;
      return;
    }

    if (this.currentView === 'david_desk' && target === 'swotSheet' && this.currentState === GameState.FindSwot) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundSwotPaper = true;
      this.isSwotPaperVisible = true;
      return;
    }
  }

  handleElenaInteraction(): void {
    const name = this.t('characters.elena.name');
    if (this.currentState === GameState.TalkToElena1) {
      this.showDialogue({ character: name, text: this.t('characters.elena.dialogues.greet'), id: 'elena_greet' });
    } else if (this.currentState === GameState.TalkToElena2) {
      this.showDialogue({ character: name, text: this.t('characters.elena.dialogues.cardFound'), id: 'elena_cardFound' });
    } else if (this.currentState === GameState.Puzzle1Complete) {
      this.showDialogue({ character: name, text: this.t('characters.elena.dialogues.quiz1Done'), id: 'elena_quiz1Done' });
    } else if (this.currentState === GameState.TalkToElena3) {
      this.showDialogue({ character: name, text: this.t('characters.elena.dialogues.swotFound'), id: 'elena_swotFound' });
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

    if (this.currentView !== 'main' && !['system_foundCard'].includes(id || '')) {
      this.currentView = 'main';
    }

    if (id === 'system_selfTalk') { this.currentState = GameState.TalkToElena1; }
    else if (id === 'elena_greet') {
      this.showDialogue({ character: elenaName, text: this.t('characters.elena.dialogues.explainMarket'), id: 'elena_explainMarket' });
    }
    else if (id === 'elena_explainMarket') {
      this.showDialogue({ character: elenaName, text: this.t('characters.elena.dialogues.findCard'), id: 'elena_findCard' });
    }
    else if (id === 'elena_findCard') { this.currentState = GameState.FindCard; }
    else if (id === 'system_clickWhiteboard') { /* player should look elsewhere */ }
    else if (id === 'system_clickDavid') { /* player should look elsewhere */ }
    else if (id === 'system_clickWindow') { /* player should look elsewhere */ }
    else if (id === 'system_cardRead') {
      this.currentView = 'main';
      this.currentState = GameState.TalkToElena2;
      this.updateBackground();
    }
    else if (id === 'elena_cardFound') {
      this.showDialogue({ character: elenaName, text: this.t('characters.elena.dialogues.cardFoundExplain'), id: 'elena_cardFoundExplain' });
    }
    else if (id === 'elena_cardFoundExplain') {
      this.currentState = GameState.Puzzle1_Matching;
      this.updateBackground();
    }
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'elena_quiz1Done') {
      this.showDialogue({ character: elenaName, text: this.t('characters.elena.dialogues.findSwot'), id: 'elena_findSwot' });
    }
    else if (id === 'elena_findSwot') { this.currentState = GameState.FindSwot; }
    else if (id === 'system_swotRead') {
      this.currentView = 'main';
      this.currentState = GameState.TalkToElena3;
      this.updateBackground();
    }
    else if (id === 'elena_swotFound') {
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
      this.showDialogue({ character: elenaName, text: this.t('characters.elena.dialogues.goodbye'), id: 'elena_goodbye' });
    }
    else if (id === 'elena_goodbye') {
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

  closePersonaCard(): void {
    this.isPersonaCardVisible = false;
    this.goBack();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.cardRead'), id: 'system_cardRead' });
  }

  closeSwotPaper(): void {
    this.isSwotPaperVisible = false;
    this.goBack();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.swotRead'), id: 'system_swotRead' });
  }

  togglePersonaCard(): void {
    if (this.hasFoundPersonaCard) {
      this.playSound('paper-rustle.wav');
      this.isPersonaCardVisible = !this.isPersonaCardVisible;
      this.isSwotPaperVisible = false;
    }
  }

  toggleSwotPaper(): void {
    if (this.hasFoundSwotPaper) {
      this.playSound('paper-rustle.wav');
      this.isSwotPaperVisible = !this.isSwotPaperVisible;
      this.isPersonaCardVisible = false;
    }
  }

  // --- Puzzle 1: Matching ---

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
    this.recordPuzzleScore('Matching', 99, true);
    this.puzzleFeedback = '';
    this.solvedMatches = ['1', '2', '3', '4'];
    this.selectedCueId = null;
    this.currentView = 'main';
    this.currentState = GameState.Puzzle1Complete;
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.allCorrect'), id: 'system_puzzle1Complete' });
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Single Choice', 99, true);
    this.puzzleFeedback = '';
    this.initSequenceOrder();
    this.currentState = GameState.Puzzle3_SequenceOrder;
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice.feedback.correct'), id: 'system_puzzle2Complete' });
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Sequence Order', 99, true);
    this.puzzleFeedback = '';
    this.currentView = 'main';
    this.currentState = GameState.Reveal;
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.sequenceOrder.feedback.correct'), id: 'system_puzzle3Complete' });
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

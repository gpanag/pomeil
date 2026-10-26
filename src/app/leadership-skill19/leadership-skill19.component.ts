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
  TalkToHRManager1,
  FindWhiteboard,
  ReadWhiteboard,
  TalkToHRManager2,
  Puzzle1_Matching,
  Puzzle1Complete,
  TalkToHRManager3,
  Puzzle2_SingleChoice,
  Puzzle2Complete,
  FindCard,
  ReadCard,
  TalkToHRManager4,
  Puzzle3_FillGap,
  Puzzle3Complete,
  TalkToHRManager5,
  Puzzle4_TrueFalse,
  Reveal,
  Completion
}

const imagePaths = {
  base_empty: '/assets/images/leadership/hr_waiting_room.png',
  base: '/assets/images/leadership/hr_waiting_room_default.png',
  base_door_open: '/assets/images/leadership/hr_waiting_room_door_open.png',
  hrManager_hover: '/assets/images/leadership/hr_manager_hover.png',
  hrManager_talking: '/assets/images/leadership/hr_manager_talking.png',
  hrManager_hover_door_open: '/assets/images/leadership/hr_manager_hover_door_open.png',
  candidate_hover: '/assets/images/leadership/candidate_hover.png',
  candidate_talking: '/assets/images/leadership/candidate_talking.png',
  candidate_hover_door_open: '/assets/images/leadership/candidate_hover_door_open.png',
  zoom_whiteboard: '/assets/images/leadership/zoom_whiteboard.png',
  zoom_desk: '/assets/images/leadership/zoom_desk.png',
  zoom_wallframe: '/assets/images/leadership/zoom_wallframe.png',
  reflection_card: '/assets/images/leadership/reflection_card.png',
};

type ViewState = 'main' | 'whiteboard' | 'desk' | 'wallframe';

const roomConfig: EscapeRoomConfig = {
  roomId: 'leadership',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
    selector: 'app-leadership-skill19',
    templateUrl: './leadership-skill19.component.html',
    styleUrl: './leadership-skill19.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class LeadershipSkill19Component extends EscapeRoomBaseComponent {

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
  isWhiteboardVisible: boolean = false;
  isReflectionCardVisible: boolean = false;

  // Item found flags
  hasFoundWhiteboard: boolean = false;
  hasFoundReflectionCard: boolean = false;

  // Hidden object search: track wrong clicks
  hasClickedDesk: boolean = false;
  hasClickedDrawer: boolean = false;

  hotspots = {
    main: {
      hrManager: { x: 59, y: 27, width: 19, height: 67 },
      candidate: { x: 9, y: 39, width: 23, height: 52 },
      whiteboard: { x: 22, y: 18, width: 27, height: 27 },
      desk: { x: 42, y: 45, width: 28, height: 35 },
      drawer: { x: 52, y: 30, width: 10, height: 40 },
      wallFrame: { x: 60, y: 5, width: 25, height: 35 },
      exitDoor: { x: 78, y: 2, width: 18, height: 72 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    whiteboard_zoom: {
      observation: { x: 35, y: 10, width: 60, height: 80 },
    },
    wallframe_zoom: {
      card: { x: 30, y: 10, width: 38, height: 80 },
    }
  };

  // --- Puzzle 1: Matching ---
  get matchingPairs() {
    return [
      { id: '1', cue: this.t('puzzles.matching.columnA.items.1'), stateId: 'c' },
      { id: '2', cue: this.t('puzzles.matching.columnA.items.2'), stateId: 'd' },
      { id: '3', cue: this.t('puzzles.matching.columnA.items.3'), stateId: 'a' },
      { id: '4', cue: this.t('puzzles.matching.columnA.items.4'), stateId: 'b' }
    ];
  }
  get matchingOptions() {
    return [
      { id: 'a', text: this.t('puzzles.matching.columnB.items.a') },
      { id: 'b', text: this.t('puzzles.matching.columnB.items.b') },
      { id: 'c', text: this.t('puzzles.matching.columnB.items.c') },
      { id: 'd', text: this.t('puzzles.matching.columnB.items.d') }
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
      { id: 'c', text: this.t('puzzles.singleChoice.options.c'), correct: true },
      { id: 'd', text: this.t('puzzles.singleChoice.options.d'), correct: false }
    ];
  }
  puzzle2WrongAttempts: number = 0;
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;

  // --- Puzzle 3: Fill-the-Gap (3 blanks) ---
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
      this.t('puzzles.fillGap.options.4'),
      this.t('puzzles.fillGap.options.5')
    ];
  }
  userGapAnswers: string[] = [null!, null!, null!];
  gapWrongAttempts: number = 0;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  // --- Puzzle 4: True/False (3 questions) ---
  currentTFQuestion: number = 0;
  tfWrongAttempts: number = 0;
  puzzle4TotalWrong: number = 0;
  puzzle4WasRevealed: boolean = false;

  override get characterImages(): CharacterImageMap {
    return {
      hrManager: { hover: imagePaths.hrManager_hover, hoverDoorOpen: imagePaths.hrManager_hover_door_open },
      candidate: { hover: imagePaths.candidate_hover, hoverDoorOpen: imagePaths.candidate_hover_door_open },
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
      this.currentState === GameState.Puzzle4_TrueFalse;
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

  override updateBackground(): void {
    if (this.activeDialogue) return;
    if (this.isQuizActive) { this.currentBackgroundUrl = imagePaths.hrManager_talking; return; }
    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }
    switch (this.currentView) {
      case 'whiteboard': this.currentBackgroundUrl = imagePaths.zoom_whiteboard; break;
      case 'desk': this.currentBackgroundUrl = imagePaths.zoom_desk; break;
      case 'wallframe': this.currentBackgroundUrl = imagePaths.zoom_wallframe; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  protected override onHintRequested(): void { this.isHintDialogue = true; }

  protected override getHintText(): string {
    if (this.currentState === GameState.TalkToHRManager1) return this.t('hints.talkToHRManager');
    if (this.currentState === GameState.FindWhiteboard) return this.t('hints.findWhiteboard');
    if (this.currentState === GameState.TalkToHRManager2) return this.t('hints.talkToHRManager2');
    if (this.currentState === GameState.Puzzle1_Matching) return this.t('hints.puzzle1Matching');
    if (this.currentState === GameState.Puzzle2_SingleChoice) return this.t('puzzles.singleChoice.hint');
    if (this.currentState === GameState.FindCard) return this.t('hints.findCard');
    if (this.currentState === GameState.TalkToHRManager3) return this.t('hints.talkToHRManager2');
    if (this.currentState === GameState.Puzzle3_FillGap) return this.t('hints.puzzle3FillGap');
    if (this.currentState === GameState.TalkToHRManager4) return this.t('hints.talkToHRManager3');
    if (this.currentState === GameState.TalkToHRManager5) return this.t('hints.talkToHRManager3');
    if (this.currentState === GameState.Puzzle4_TrueFalse) return this.t('hints.puzzle4TrueFalse');
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

    if (target === 'hrManager') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.hrManager_talking;
      this.handleHRManagerInteraction();
      return;
    }

    if (target === 'candidate') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.candidate_talking;
      const name = this.t('characters.candidate.name');
      this.showDialogue({ character: name, text: this.t('characters.candidate.dialogues.busy'), id: 'candidate_busy' });
      return;
    }

    if (this.currentView === 'main') {
      // Whiteboard click during FindWhiteboard (zoom in, player must click within zoomed view)
      if (target === 'whiteboard' && this.currentState === GameState.FindWhiteboard) {
        this.zoomToLocation('whiteboard', this.hotspots.main, () => {
          this.currentView = 'whiteboard';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on observation within zoomed view
        }, 2.5);
        return;
      }

      // Desk click during FindCard (wrong spot)
      if (target === 'desk' && this.currentState === GameState.FindCard) {
        this.hasClickedDesk = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickDesk'), id: 'system_clickDesk' });
        return;
      }

      // Drawer click during FindCard (wrong spot)
      if (target === 'drawer' && this.currentState === GameState.FindCard) {
        this.hasClickedDrawer = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickDrawer'), id: 'system_clickDrawer' });
        return;
      }

      // Wall frame click during FindCard (correct — zoom in, player must click card within zoomed view)
      if (target === 'wallFrame' && this.currentState === GameState.FindCard) {
        this.zoomToLocation('wallFrame', this.hotspots.main, () => {
          this.currentView = 'wallframe';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on card within zoomed view
        }, 2.5);
        return;
      }
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'whiteboard' && target === 'observation' && this.currentState === GameState.FindWhiteboard) {
      this.playSound('success-chime.wav');
      this.hasFoundWhiteboard = true;
      this.isWhiteboardVisible = true;
      return;
    }

    if (this.currentView === 'wallframe' && target === 'card' && this.currentState === GameState.FindCard) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundReflectionCard = true;
      this.isReflectionCardVisible = true;
      return;
    }
  }

  handleHRManagerInteraction(): void {
    const name = this.t('characters.hrManager.name');
    if (this.currentState === GameState.TalkToHRManager1) {
      this.showDialogue({ character: name, text: this.t('characters.hrManager.dialogues.greet'), id: 'hrManager_greet' });
    } else if (this.currentState === GameState.TalkToHRManager2) {
      this.showDialogue({ character: name, text: this.t('characters.hrManager.dialogues.whiteboardFound'), id: 'hrManager_whiteboardFound' });
    } else if (this.currentState === GameState.Puzzle1Complete || this.currentState === GameState.TalkToHRManager3) {
      this.showDialogue({ character: name, text: this.t('characters.hrManager.dialogues.puzzle1Done'), id: 'hrManager_puzzle1Done' });
    } else if (this.currentState === GameState.TalkToHRManager4) {
      this.showDialogue({ character: name, text: this.t('characters.hrManager.dialogues.cardFound'), id: 'hrManager_cardFound' });
    } else if (this.currentState === GameState.TalkToHRManager5) {
      this.showDialogue({ character: name, text: this.t('characters.hrManager.dialogues.puzzle3Done'), id: 'hrManager_puzzle3Done' });
    } else if (this.currentState === GameState.Completion) {
      this.showDialogue({ character: name, text: this.t('characters.hrManager.dialogues.completion'), id: 'hrManager_completion' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.hrManager.dialogues.default'), id: 'hrManager_default' });
    }
  }

  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;
    this.updateBackground();

    if (this.isHintDialogue) { this.isHintDialogue = false; this.showHintPulse(); }
    else { this.showHints = false; }

    const hrName = this.t('characters.hrManager.name');

    if (this.currentView !== 'main' && !['system_whiteboardFound'].includes(id || '')) {
      this.currentView = 'main';
    }

    if (id === 'system_selfTalk') { this.currentState = GameState.TalkToHRManager1; }
    else if (id === 'hrManager_greet') {
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.enterOffice'), id: 'hrManager_enterOffice' });
    }
    else if (id === 'hrManager_enterOffice') {
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.enterOffice2'), id: 'hrManager_enterOffice2' });
    }
    else if (id === 'hrManager_enterOffice2') { this.currentState = GameState.FindWhiteboard; }
    else if (id === 'system_whiteboardFound') {
      // Whiteboard popup already visible
    }
    else if (id === 'system_whiteboardRead') {
      this.currentView = 'main';
      this.currentState = GameState.TalkToHRManager2;
      this.updateBackground();
    }
    else if (id === 'hrManager_whiteboardFound') {
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.puzzle1Intro'), id: 'hrManager_puzzle1Intro' });
    }
    else if (id === 'hrManager_puzzle1Intro') {
      this.currentState = GameState.Puzzle1_Matching;
      this.updateBackground();
    }
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'hrManager_puzzle1Done') {
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.puzzle1Done2'), id: 'hrManager_puzzle1Done2' });
    }
    else if (id === 'hrManager_puzzle1Done2') {
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.puzzle2Intro'), id: 'hrManager_puzzle2Intro' });
    }
    else if (id === 'hrManager_puzzle2Intro') {
      this.currentState = GameState.Puzzle2_SingleChoice;
      this.updateBackground();
    }
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.puzzle2Done'), id: 'hrManager_puzzle2Done' });
    }
    else if (id === 'hrManager_puzzle2Done') {
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.findCard'), id: 'hrManager_findCard' });
    }
    else if (id === 'hrManager_findCard') { this.currentState = GameState.FindCard; }
    else if (id === 'system_clickDesk') { /* player should look elsewhere */ }
    else if (id === 'system_clickDrawer') { /* player should look elsewhere */ }
    else if (id === 'system_cardRead') {
      this.currentView = 'main';
      this.currentState = GameState.TalkToHRManager4;
      this.updateBackground();
    }
    else if (id === 'hrManager_cardFound') {
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.puzzle3Intro'), id: 'hrManager_puzzle3Intro' });
    }
    else if (id === 'hrManager_puzzle3Intro') {
      this.currentState = GameState.Puzzle3_FillGap;
      this.updateBackground();
    }
    else if (id === 'system_puzzle3Complete') {
      // State already changed before dialogue was shown
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.puzzle3Done'), id: 'hrManager_puzzle3Done' });
    }
    else if (id === 'hrManager_puzzle3Done') {
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.puzzle4Intro'), id: 'hrManager_puzzle4Intro' });
    }
    else if (id === 'hrManager_puzzle4Intro') {
      this.currentState = GameState.Puzzle4_TrueFalse;
      this.currentTFQuestion = 0;
      this.updateBackground();
    }
    else if (id === 'system_puzzle4Complete') {
      // State already changed before dialogue was shown
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.finalWords1'), id: 'hrManager_finalWords1' });
    }
    else if (id === 'hrManager_finalWords1') {
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.finalWords2'), id: 'hrManager_finalWords2' });
    }
    else if (id === 'hrManager_finalWords2') {
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.finalWords3'), id: 'hrManager_finalWords3' });
    }
    else if (id === 'hrManager_finalWords3') {
      this.showDialogue({ character: hrName, text: this.t('characters.hrManager.dialogues.finalWords4'), id: 'hrManager_finalWords4' });
    }
    else if (id === 'hrManager_finalWords4') {
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

  closeWhiteboard(): void {
    this.isWhiteboardVisible = false;
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.whiteboardFound'), id: 'system_whiteboardRead' });
  }

  closeReflectionCard(): void {
    this.isReflectionCardVisible = false;
    this.goBack();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundCard'), id: 'system_cardRead' });
  }

  toggleWhiteboard(): void {
    if (this.hasFoundWhiteboard) {
      this.playSound('paper-rustle.wav');
      this.isWhiteboardVisible = !this.isWhiteboardVisible;
      this.isReflectionCardVisible = false;
    }
  }

  toggleReflectionCard(): void {
    if (this.hasFoundReflectionCard) {
      this.playSound('paper-rustle.wav');
      this.isReflectionCardVisible = !this.isReflectionCardVisible;
      this.isWhiteboardVisible = false;
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
        this.currentState = GameState.Puzzle2Complete;
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
        this.currentState = GameState.Puzzle2Complete;
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

  // --- Puzzle 3: Fill-the-Gap (3 blanks) ---

  fillGap(word: string): void {
    this.fillGapSlot(this.userGapAnswers, word);
  }

  resetGap(): void {
    this.userGapAnswers = [null!, null!, null!];
    this.puzzleFeedback = '';
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
    this.currentState = GameState.Puzzle2Complete;
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice.feedback.correct'), id: 'system_puzzle2Complete' });
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Fill the Gap', 99, true);
    this.puzzleFeedback = '';
    this.userGapAnswers = [null!, null!, null!];
    this.currentState = GameState.Puzzle3Complete;
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.fillGap.feedback.correct'), id: 'system_puzzle3Complete' });
  }

  skipPuzzle4(): void {
    this.recordPuzzleScore('True/False', 99, true);
    this.puzzleFeedback = '';
    this.currentTFQuestion = 3;
    this.currentState = GameState.Reveal;
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.trueFalse.feedback.correct'), id: 'system_puzzle4Complete' });
  }

  // --- Puzzle 4: True/False ---

  submitTrueFalse(answer: boolean): void {
    const questions = [false, true, true]; // correct answers: False, True, True
    const correct = questions[this.currentTFQuestion] === answer;

    if (correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.currentTFQuestion++;
      if (this.currentTFQuestion >= 3) {
        this.recordPuzzleScore('True/False', this.puzzle4TotalWrong, this.puzzle4WasRevealed);
        setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Reveal;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.trueFalse.feedback.correct'), id: 'system_puzzle4Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
      }
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.puzzle4TotalWrong++;

      // T/F: show correct answer briefly then auto-advance
      this.puzzleFeedback = this.t('puzzles.trueFalse.feedback.wrong');

      setTimeout(() => {
        this.isPuzzleWrong = false;
        this.puzzleFeedback = '';
        this.currentTFQuestion++;
        if (this.currentTFQuestion >= 3) {
          this.recordPuzzleScore('True/False', this.puzzle4TotalWrong, this.puzzle4WasRevealed);
          setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Reveal;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.trueFalse.feedback.correct'), id: 'system_puzzle4Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        }
      }, 1500);
    }
  }
}

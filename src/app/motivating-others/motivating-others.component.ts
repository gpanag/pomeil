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
  TalkToCandidate1,
  CandidateGreet2,
  Puzzle1_SingleChoice,
  Puzzle1Complete,
  CandidateAfterTask1,
  TalkToHrManager,
  FindFolder,
  StrengthRecognition,
  StrengthsComplete,
  Puzzle2_SequenceOrder,
  Puzzle2Complete,
  Puzzle3_Matching,
  Puzzle3Complete,
  BodyLanguage,
  BodyLanguageComplete,
  CandidateThankYou,
  Reveal,
  Completion
}

const imagePaths = {
  base_empty: '/assets/images/motivating_others/waiting_area.png',
  base: '/assets/images/motivating_others/waiting_area_default.png',
  base_door_open: '/assets/images/motivating_others/waiting_area_door_open.png',
  hrManager_hover: '/assets/images/motivating_others/hr_manager_hover.png',
  hrManager_talking: '/assets/images/motivating_others/hr_manager_talking.png',
  hrManager_hover_door_open: '/assets/images/motivating_others/hr_manager_hover_door_open.png',
  candidate_hover: '/assets/images/motivating_others/candidate_hover.png',
  candidate_talking: '/assets/images/motivating_others/candidate_talking.png',
  candidate_hover_door_open: '/assets/images/motivating_others/candidate_hover_door_open.png',
  zoom_folder: '/assets/images/motivating_others/zoom_folder.png',
  folder: '/assets/images/motivating_others/folder.png',
};

type ViewState = 'main' | 'folder';

const roomConfig: EscapeRoomConfig = {
  roomId: 'motivating-others',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
  selector: 'app-motivating-others',
  templateUrl: './motivating-others.component.html',
  styleUrl: './motivating-others.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule, DragDropModule],
  animations: [fadeInOut]
})
export class MotivatingOthersComponent extends EscapeRoomBaseComponent {

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

  // Item found flags
  hasFoundFolder: boolean = false;

  hotspots = {
    main: {
      hrManager: { x: 60, y: 12, width: 21, height: 87 },
      candidate: { x: 8, y: 44, width: 22, height: 55 },
      folder: { x: 82, y: 66, width: 10, height: 3 },
      exitDoor: { x: 46, y: 26, width: 11, height: 43 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    folder_zoom: {
      folder_item: { x: 8, y: 37, width: 86, height: 62 },
    }
  };

  // --- Puzzle 1: Single Choice (Emotional Awareness) ---
  get puzzle1Options() {
    return [
      { id: 'a', text: this.t('puzzles.singleChoice.options.a'), correct: false },
      { id: 'b', text: this.t('puzzles.singleChoice.options.b'), correct: false },
      { id: 'c', text: this.t('puzzles.singleChoice.options.c'), correct: true },
      { id: 'd', text: this.t('puzzles.singleChoice.options.d'), correct: false }
    ];
  }
  puzzle1WrongAttempts: number = 0;
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;

  // --- Strength Recognition (interactive, not scored) ---
  selectedStrengths: string[] = [];
  strengthFeedback: string = '';
  strengthsResolved: boolean = false;

  // --- Puzzle 2: Sequence Ordering ---
  userSequence: string[] = [];
  puzzle2WrongAttempts: number = 0;
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;

  // --- Puzzle 3: Matching ---
  get matchingPairs() {
    return [
      { id: '1', cue: this.t('puzzles.matching.pairs.0.left'), stateId: 'a' },
      { id: '2', cue: this.t('puzzles.matching.pairs.1.left'), stateId: 'b' },
      { id: '3', cue: this.t('puzzles.matching.pairs.2.left'), stateId: 'c' }
    ];
  }
  get matchingOptions() {
    return [
      { id: 'a', text: this.t('puzzles.matching.pairs.0.right') },
      { id: 'b', text: this.t('puzzles.matching.pairs.1.right') },
      { id: 'c', text: this.t('puzzles.matching.pairs.2.right') }
    ];
  }
  selectedCueId: string | null = null;
  solvedMatches: string[] = [];
  matchingWrongAttempts: number = 0;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  // --- Body Language (interactive, not scored) ---
  selectedBodyLanguage: string[] = [];
  bodyLanguageFeedback: string = '';
  bodyLanguageResolved: boolean = false;

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
    return this.currentState === GameState.Puzzle1_SingleChoice ||
      this.currentState === GameState.StrengthRecognition ||
      this.currentState === GameState.Puzzle2_SequenceOrder ||
      this.currentState === GameState.Puzzle3_Matching ||
      this.currentState === GameState.BodyLanguage;
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
    if (this.isQuizActive) { this.currentBackgroundUrl = imagePaths.candidate_talking; return; }
    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }
    switch (this.currentView) {
      case 'folder': this.currentBackgroundUrl = imagePaths.zoom_folder; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  protected override onHintRequested(): void { this.isHintDialogue = true; }

  protected override getHintText(): string {
    if (this.currentState === GameState.TalkToCandidate1) return this.t('hints.talkToCandidate');
    if (this.currentState === GameState.CandidateAfterTask1 || this.currentState === GameState.TalkToHrManager) return this.t('hints.talkToHrManager');
    if (this.currentState === GameState.FindFolder) return this.t('hints.findFolder');
    if (this.currentState === GameState.StrengthsComplete || this.currentState === GameState.Puzzle1Complete) return this.t('hints.talkToCandidate2');
    if (this.currentState === GameState.Completion) return this.t('hints.completion');
    if (this.currentState === GameState.Puzzle1_SingleChoice) return this.t('puzzles.singleChoice.hint');
    if (this.currentState === GameState.Puzzle2_SequenceOrder) return this.t('puzzles.sequenceOrder.hints.0');
    if (this.currentState === GameState.StrengthRecognition) return this.t('hints.strengthRecognition');
    if (this.currentState === GameState.Puzzle3_Matching) return this.t('hints.matching');
    if (this.currentState === GameState.BodyLanguage) return this.t('hints.bodyLanguage');
    if (this.currentState === GameState.CandidateThankYou) return this.t('hints.talkToCandidate2');
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

    if (target === 'candidate') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.candidate_talking;
      this.handleCandidateInteraction();
      return;
    }

    if (target === 'hrManager') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.hrManager_talking;
      this.handleHrManagerInteraction();
      return;
    }

    if (this.currentView === 'main') {
      // Folder click during FindFolder — zoom in, player must click item within zoomed view
      if (target === 'folder' && this.currentState === GameState.FindFolder) {
        this.zoomToLocation('folder', this.hotspots.main, () => {
          this.currentView = 'folder';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on folder within zoomed view
        }, 2.5);
        return;
      }
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'folder' && target === 'folder_item' && this.currentState === GameState.FindFolder) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav', 700);
      this.hasFoundFolder = true;
      this.isFolderVisible = true;
      return;
    }
  }

  handleCandidateInteraction(): void {
    const name = this.t('characters.candidate.name');
    if (this.currentState === GameState.TalkToCandidate1) {
      this.showDialogue({ character: name, text: this.t('characters.candidate.dialogues.greet'), id: 'candidate_greet' });
    } else if (this.currentState === GameState.CandidateAfterTask1) {
      this.showDialogue({ character: name, text: this.t('characters.candidate.dialogues.afterTask1'), id: 'candidate_afterTask1' });
    } else if (this.currentState === GameState.StrengthsComplete) {
      this.showDialogue({ character: name, text: this.t('characters.candidate.dialogues.afterStrengths'), id: 'candidate_afterStrengths' });
    } else if (this.currentState === GameState.CandidateThankYou) {
      this.showDialogue({ character: name, text: this.t('characters.candidate.dialogues.thankYou'), id: 'candidate_thankYou' });
    } else if (this.currentState === GameState.Completion) {
      this.showDialogue({ character: name, text: this.t('characters.candidate.dialogues.thankYou'), id: 'candidate_completion' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.candidate.dialogues.default'), id: 'candidate_default' });
    }
  }

  handleHrManagerInteraction(): void {
    const name = this.t('characters.hrManager.name');
    if (this.currentState === GameState.TalkToHrManager) {
      this.showDialogue({ character: name, text: this.t('characters.hrManager.dialogues.observe'), id: 'hrManager_observe' });
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

    const candidateName = this.t('characters.candidate.name');
    const hrManagerName = this.t('characters.hrManager.name');

    if (this.currentView !== 'main') {
      this.currentView = 'main';
    }

    if (id === 'system_selfTalk') { this.currentState = GameState.TalkToCandidate1; }
    else if (id === 'candidate_greet') {
      this.currentBackgroundUrl = imagePaths.candidate_talking;
      this.showDialogue({ character: candidateName, text: this.t('characters.candidate.dialogues.greet2'), id: 'candidate_greet2' });
    }
    else if (id === 'candidate_greet2') {
      this.currentState = GameState.Puzzle1_SingleChoice;
      this.updateBackground();
    }
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'candidate_afterTask1') {
      this.currentState = GameState.TalkToHrManager;
      this.updateBackground();
    }
    else if (id === 'hrManager_observe') {
      this.currentState = GameState.FindFolder;
      this.updateBackground();
    }
    else if (id === 'system_foundFolder') {
      this.currentState = GameState.StrengthRecognition;
      this.updateBackground();
    }
    else if (id === 'system_strengthsCorrect') {
      // State already changed before dialogue was shown
    }
    else if (id === 'candidate_afterStrengths') {
      this.initSequenceOrder();
      this.currentState = GameState.Puzzle2_SequenceOrder;
      this.updateBackground();
    }
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'system_puzzle3Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'system_bodyLanguageCorrect') {
      // State already changed before dialogue was shown
    }
    else if (id === 'candidate_thankYou') {
      this.currentState = GameState.Reveal;
      this.updateBackground();
      this.currentBackgroundUrl = imagePaths.hrManager_talking;
      this.showDialogue({ character: hrManagerName, text: this.t('characters.hrManager.dialogues.finalWords'), id: 'hrManager_finalWords' });
    }
    else if (id === 'hrManager_finalWords') {
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

  closeFolder(): void {
    this.isFolderVisible = false;
    this.goBack();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundFolder'), id: 'system_foundFolder' });
  }

  toggleFolder(): void {
    if (this.hasFoundFolder) {
      this.playSound('paper-rustle.wav', 700);
      this.isFolderVisible = !this.isFolderVisible;
    }
  }

  // --- Skip Puzzle Methods ---

  skipPuzzle1(): void {
    this.recordPuzzleScore('Single Choice', 99, true);
    this.currentState = GameState.CandidateAfterTask1;
    this.puzzleFeedback = '';
    this.updateBackground();
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Sequence Order', 99, true);
    this.currentState = GameState.Puzzle3_Matching;
    this.puzzleFeedback = '';
    this.updateBackground();
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Matching', 99, true);
    this.currentState = GameState.BodyLanguage;
    this.puzzleFeedback = '';
    this.updateBackground();
  }

  // --- Puzzle 1: Single Choice (Emotional Awareness) ---

  submitPuzzle1(option: { id: string; text: string; correct: boolean }): void {
    if (option.correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.recordPuzzleScore('Single Choice', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
      setTimeout(() => {
        this.currentState = GameState.CandidateAfterTask1;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice.feedback.correct'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.puzzle1WrongAttempts++;
      this.puzzle1TotalWrong++;

      if (this.puzzle1WrongAttempts >= 3) {
        this.puzzle1WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.singleChoice.answerOverlay');
        this.answerOverlayCallback = () => {
          this.puzzle1WrongAttempts = 0;
          this.recordPuzzleScore('Single Choice', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
          setTimeout(() => {
        this.currentState = GameState.CandidateAfterTask1;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.singleChoice.feedback.correct'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.singleChoice.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Strength Recognition (interactive, not scored) ---

  toggleStrength(id: string): void {
    const idx = this.selectedStrengths.indexOf(id);
    if (idx >= 0) {
      this.selectedStrengths.splice(idx, 1);
    } else if (this.selectedStrengths.length < 2) {
      this.selectedStrengths.push(id);
    }
    this.strengthFeedback = '';
  }

  submitStrengths(): void {
    if (this.selectedStrengths.length !== 2) return;

    const correctIds = ['language', 'volunteering'];
    const isCorrect = this.selectedStrengths.every(id => correctIds.includes(id));

    if (isCorrect) {
      this.playSound('success-chime.wav');
      this.strengthFeedback = '';
      this.strengthsResolved = true;
      setTimeout(() => {
        this.currentState = GameState.StrengthsComplete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('strengths.feedback.correct'), id: 'system_strengthsCorrect' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.strengthFeedback = this.t('strengths.feedback.wrong');
      this.selectedStrengths = [];
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
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
        this.currentState = GameState.Puzzle3_Matching;
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
        this.currentState = GameState.Puzzle3_Matching;
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

  // --- Puzzle 3: Matching ---

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
        this.recordPuzzleScore('Matching', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
        setTimeout(() => {
        this.currentState = GameState.BodyLanguage;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.correct'), id: 'system_puzzle3Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
      }
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.matchingWrongAttempts++;
      this.puzzle3TotalWrong++;

      if (this.matchingWrongAttempts >= 3) {
        this.puzzle3WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.matching.answerOverlay');
        this.answerOverlayCallback = () => {
          this.matchingWrongAttempts = 0;
          this.solvedMatches = ['1', '2', '3'];
          this.recordPuzzleScore('Matching', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
          setTimeout(() => {
        this.currentState = GameState.BodyLanguage;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.correct'), id: 'system_puzzle3Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.matching.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Body Language (interactive, not scored) ---

  toggleBodyLanguage(id: string): void {
    const idx = this.selectedBodyLanguage.indexOf(id);
    if (idx >= 0) {
      this.selectedBodyLanguage.splice(idx, 1);
    } else if (this.selectedBodyLanguage.length < 2) {
      this.selectedBodyLanguage.push(id);
    }
    this.bodyLanguageFeedback = '';
  }

  submitBodyLanguage(): void {
    if (this.selectedBodyLanguage.length !== 2) return;

    const correctIds = ['clenched', 'eyeContact'];
    const isCorrect = this.selectedBodyLanguage.every(id => correctIds.includes(id));

    if (isCorrect) {
      this.playSound('success-chime.wav');
      this.bodyLanguageFeedback = '';
      this.bodyLanguageResolved = true;
      setTimeout(() => {
        this.currentState = GameState.CandidateThankYou;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('bodyLanguage.feedback.correct'), id: 'system_bodyLanguageCorrect' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.bodyLanguageFeedback = this.t('bodyLanguage.feedback.wrong');
      this.selectedBodyLanguage = [];
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }
}

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
  FindStones,
  StonesFound,
  StonesReturned,
  Puzzle1_Matching,
  Puzzle1_Complete,
  FindFabric,
  FabricFound,
  FabricReturned,
  Puzzle2_FillGap,
  Puzzle3_Pattern,
  Completion
}

const imagePaths = {
  // Main Views
  base: '/assets/images/empathy/meditation_room.png',
  base_door_open: '/assets/images/empathy/meditation_room_door_open.png',

  // Character Interactions
  coach_hover: '/assets/images/empathy/coach_hover.png',
  coach_talking: '/assets/images/empathy/coach_talking.png',
  coach_hover_door_open: '/assets/images/empathy/coach_hover_door_open.png',
  mark_hover: '/assets/images/empathy/mark_hover.png',
  mark_talking: '/assets/images/empathy/mark_talking.png',
  mark_hover_door_open: '/assets/images/empathy/mark_hover_door_open.png',

  // Zoomed Views
  zoom_shelf: '/assets/images/empathy/zoom_shelf.png',
  zoom_fountain: '/assets/images/empathy/zoom_fountain.png',
  zoom_cushion: '/assets/images/empathy/zoom_cushion.png',
  zoom_bookshelf: '/assets/images/empathy/zoom_bookshelf.png',
  zoom_blankets: '/assets/images/empathy/zoom_blankets.png',
  zoom_mats: '/assets/images/empathy/zoom_mats.png',

  // Items
  stones: '/assets/images/empathy/stones.png',
  fabric: '/assets/images/empathy/fabric.png'
};

type ViewState = 'main' | 'shelf' | 'fountain' | 'cushion' | 'bookshelf' | 'blankets' | 'mats';

const roomConfig: EscapeRoomConfig = {
  roomId: 'empathy',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
};

@Component({
  selector: 'app-empathy-skill22',
  templateUrl: './empathy-skill22.component.html',
  styleUrl: './empathy-skill22.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
  animations: [fadeInOut]
})
export class EmpathySkill22Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  // TrackBy functions to prevent *ngFor from recreating DOM when getters return new arrays
  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'main';

  // Hint System
  public isHintDialogue: boolean = false;
  public questStep: number = 0;

  isStonesVisible: boolean = false;
  isFabricVisible: boolean = false;

  hasFoundStones: boolean = false;
  hasFoundFabric: boolean = false;

  hotspots = {
    main: {
      coach: { x: 20, y: 50, width: 12, height: 30 },
      mark: { x: 70, y: 50, width: 10, height: 30 },
      shelf: { x: 52, y: 65, width: 16, height: 17 },
      fountain: { x: 5, y: 70, width: 12, height: 18 },
      orangeCushion: { x: 42, y: 85, width: 16, height: 8 },
      bookshelf: { x: 82, y: 25, width: 12, height: 40 },
      blankets: { x: 75, y: 65, width: 8, height: 15 },
      mats: { x: 90, y: 70, width: 10, height: 25 },
      exitDoor: { x: 35, y: 20, width: 18, height: 50 },
    }
  };

  get matchingPairs() {
    return [
      { id: '1', cue: this.t('puzzles.matching.columnA.items.1'), stateId: 'b' },
      { id: '2', cue: this.t('puzzles.matching.columnA.items.2'), stateId: 'd' },
      { id: '3', cue: this.t('puzzles.matching.columnA.items.3'), stateId: 'c' },
      { id: '4', cue: this.t('puzzles.matching.columnA.items.4'), stateId: 'a' }
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
          { text: this.t('puzzles.pattern.scenarios.1.options.0.text'), correct: true },
          { text: this.t('puzzles.pattern.scenarios.1.options.1.text'), correct: false },
          { text: this.t('puzzles.pattern.scenarios.1.options.2.text'), correct: false },
          { text: this.t('puzzles.pattern.scenarios.1.options.3.text'), correct: false }
        ],
        hint: this.t('puzzles.pattern.scenarios.1.hint')
      },
      {
        text: this.t('puzzles.pattern.scenarios.2.text'),
        options: [
          { text: this.t('puzzles.pattern.scenarios.2.options.0.text'), correct: true },
          { text: this.t('puzzles.pattern.scenarios.2.options.1.text'), correct: false },
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
      coach: { hover: imagePaths.coach_hover, hoverDoorOpen: imagePaths.coach_hover_door_open },
      mark: { hover: imagePaths.mark_hover, hoverDoorOpen: imagePaths.mark_hover_door_open },
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

    // Show coach talking image during quizzes
    if (this.currentState === GameState.Puzzle1_Matching ||
        this.currentState === GameState.Puzzle2_FillGap ||
        this.currentState === GameState.Puzzle3_Pattern) {
      this.currentBackgroundUrl = imagePaths.coach_talking;
      return;
    }

    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }

    switch (this.currentView) {
      case 'shelf': this.currentBackgroundUrl = imagePaths.zoom_shelf; break;
      case 'fountain': this.currentBackgroundUrl = imagePaths.zoom_fountain; break;
      case 'cushion': this.currentBackgroundUrl = imagePaths.zoom_cushion; break;
      case 'bookshelf': this.currentBackgroundUrl = imagePaths.zoom_bookshelf; break;
      case 'blankets': this.currentBackgroundUrl = imagePaths.zoom_blankets; break;
      case 'mats': this.currentBackgroundUrl = imagePaths.zoom_mats; break;
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
    } else if (this.currentState === GameState.StonesReturned) {
      return this.t('hints.stonesReturned');
    } else if (this.currentState === GameState.StonesFound) {
      return this.t('hints.stonesFound');
    } else if (this.currentState === GameState.FabricFound) {
      return this.t('hints.fabricFound');
    } else if (this.currentState === GameState.FindStones) {
      if (this.questStep === 0) return this.t('hints.findStones.step0');
      else if (this.questStep === 1) return this.t('hints.findStones.step1');
      else return this.t('hints.findStones.step2');
    } else if (this.currentState === GameState.FindFabric) {
      if (this.questStep === 0) return this.t('hints.findFabric.step0');
      else if (this.questStep === 1) return this.t('hints.findFabric.step1');
      else return this.t('hints.findFabric.step2');
    } else if (this.currentState === GameState.Puzzle1_Matching) {
      return this.t('hints.puzzle1Matching');
    } else if (this.currentState === GameState.Puzzle2_FillGap) {
      return this.t('hints.puzzle2FillGap');
    } else if (this.currentState === GameState.Puzzle3_Pattern) {
      return this.patternScenarios[this.currentPatternIndex].hint;
    } else if (this.currentState === GameState.Completion) {
      return this.t('hints.completion');
    }
    return this.t('hints.default');
  }

  // --- Hotspot clicks ---
  override onHotspotClick(target: string): void {
    this.showHints = false;
    if (this.activeDialogue) return;

    if (target === 'exitDoor' && this.isDoorOpen && this.currentState === GameState.Completion) {
      this.playSound('success-chime.wav');
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
      return;
    }

    if (target === 'coach') {
      this.playSound('character-click.wav');
      this.currentBackgroundUrl = imagePaths.coach_talking;
      this.handleCoachInteraction();
      return;
    }

    if (target === 'mark') {
      this.playSound('character-click.wav');
      this.currentBackgroundUrl = imagePaths.mark_talking;
      if (this.currentState === GameState.Completion && this.isDoorOpen) {
        this.showDialogue({ character: this.t('characters.mark.name'), text: this.t('characters.mark.dialogues.completion'), id: 'mark_completion' });
      } else {
        this.showDialogue({ character: this.t('characters.mark.name'), text: this.t('characters.mark.dialogues.default'), id: 'mark_default' });
      }
      return;
    }

    if (this.currentView === 'main') {
      // Map 'orangeCushion' to 'cushion' ViewState
      let mappedTarget = target;
      if (target === 'orangeCushion') mappedTarget = 'cushion';

      // Ensure target is valid ViewState
      if (['shelf', 'fountain', 'cushion', 'bookshelf', 'blankets', 'mats'].includes(mappedTarget)) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = mappedTarget as ViewState;
          this.updateBackground();
          this.resetZoom(true);
          setTimeout(() => this.checkItem(mappedTarget), 800);
        }, 2.5);
        return;
      }
    }
  }

  checkItem(item: string): void {
    if (this.currentState === GameState.FindStones) {
      if (item === 'shelf') {
        this.questStep = Math.max(this.questStep, 1);
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.findStones.shelf'), id: 'system_shelf' });
      } else if (item === 'fountain') {
        this.questStep = Math.max(this.questStep, 2);
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.findStones.fountain'), id: 'system_fountain' });
      } else if (item === 'cushion') {
        this.playSound('success-chime.wav');
        this.playSound('paper-rustle.wav');
        this.hasFoundStones = true;
        this.currentState = GameState.StonesFound;
        this.isStonesVisible = true;
      }
    }

    else if (this.currentState === GameState.FindFabric) {
      if (item === 'bookshelf') {
        this.questStep = Math.max(this.questStep, 1);
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.findFabric.bookshelf'), id: 'system_bookshelf' });
      } else if (item === 'blankets') {
        this.questStep = Math.max(this.questStep, 2);
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.findFabric.blankets'), id: 'system_blankets' });
      } else if (item === 'mats') {
        this.playSound('success-chime.wav');
        this.playSound('paper-rustle.wav');
        this.hasFoundFabric = true;
        this.currentState = GameState.FabricFound;
        this.isFabricVisible = true;
      }
    }
  }

  handleCoachInteraction(): void {
    const state = this.currentState;
    const coachName = this.t('characters.coach.name');

    if (state === GameState.Intro) {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.intro'), id: 'coach_intro' });
    }
    else if (state === GameState.FindStones) {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.findStones_reminder'), id: 'coach_findStones_reminder' });
    }
    else if (state === GameState.StonesFound) {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.stonesFound'), id: 'coach_stonesFound' });
    }
    else if (state === GameState.StonesReturned) {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.stonesReturned'), id: 'coach_stonesReturned' });
    }
    else if (state === GameState.Puzzle1_Complete) {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.puzzle1Complete'), id: 'coach_puzzle1Complete' });
      this.currentState = GameState.FindFabric;
      this.questStep = 0;
    }
    else if (state === GameState.FindFabric) {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.findFabric_reminder'), id: 'coach_findFabric_reminder' });
    }
    else if (state === GameState.FabricFound) {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.fabricFound'), id: 'coach_fabricFound' });
    }
    else if (state === GameState.FabricReturned) {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.fabricReturned'), id: 'coach_fabricReturned' });
    }
    else if (state === GameState.Completion) {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.completion'), id: 'coach_completion' });
    }
    else {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.default'), id: 'coach_default' });
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

    const coachName = this.t('characters.coach.name');

    if (id === 'coach_intro') {
      this.currentState = GameState.FindStones;
      this.questStep = 0;
      setTimeout(() => this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.findStones_initial'), id: 'coach_findStones_initial' }), ESCAPE_ROOM_TIMING.zoomOutDelay);
    }
    else if (id === 'coach_stonesReturned') {
       this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.empathyExplanation1'), id: 'coach_empathyExplanation1' });
    }
    else if (id === 'coach_empathyExplanation1') {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.empathyExplanation2'), id: 'coach_empathyExplanation2' });
    }
    else if (id === 'coach_empathyExplanation2') {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.empathyExplanation3'), id: 'coach_empathyExplanation3' });
    }
    else if (id === 'coach_empathyExplanation3') {
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.empathyExplanation4'), id: 'coach_empathyExplanation4' });
    }
    else if (id === 'coach_empathyExplanation4') {
      this.currentState = GameState.Puzzle1_Matching;
      this.updateBackground();
    }
    else if (id === 'system_nextTask') {
      this.currentState = GameState.Puzzle1_Complete;
      this.showDialogue({ character: coachName, text: this.t('characters.coach.dialogues.puzzle1Complete'), id: 'coach_puzzle1Complete' });
    }
    else if (id === 'coach_puzzle1Complete') {
      this.currentState = GameState.FindFabric;
      this.questStep = 0;
    }
    else if (id === 'coach_fabricReturned') {
      this.currentState = GameState.Puzzle2_FillGap;
      this.updateBackground();
    }
    else if (id === 'coach_patternComplete') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.empathyComplete'), id: 'system_empathyComplete' });
    }
    else if (id === 'system_empathyComplete') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.readyNextSkill'), id: 'system_readyNextSkill' });
    }
    else if (id === 'system_readyNextSkill') {
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

  // --- UI Helpers ---

  protected override resetZoomState(): void {
    this.currentView = 'main';
  }

  closeStones(): void {
    this.isStonesVisible = false;
    this.goBack();
    if (this.currentState === GameState.StonesFound) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('items.stones.foundDialogue'), id: 'system_foundStones' });
        this.currentState = GameState.StonesReturned;
    }
  }

  closeFabric(): void {
    this.isFabricVisible = false;
    this.goBack();
    if (this.currentState === GameState.FabricFound) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('items.fabric.foundDialogue'), id: 'system_foundFabric' });
        this.currentState = GameState.FabricReturned;
    }
  }

  toggleStones(): void {
    if (this.hasFoundStones) {
      this.playSound('paper-rustle.wav');
      this.isStonesVisible = !this.isStonesVisible;
      this.isFabricVisible = false;
    }
  }

  toggleFabric(): void {
    if (this.hasFoundFabric) {
      this.playSound('paper-rustle.wav');
      this.isFabricVisible = !this.isFabricVisible;
      this.isStonesVisible = false;
    }
  }

  // --- Puzzle Logic ---

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
        this.currentState = GameState.Puzzle1_Complete;
        setTimeout(() => this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.allCorrect'), id: 'system_nextTask' }), ESCAPE_ROOM_TIMING.completionTransitionDelay);
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
          this.currentState = GameState.Puzzle1_Complete;
          setTimeout(() => this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.allCorrect'), id: 'system_nextTask' }), ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.matching.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  fillGap(word: string): void {
    this.fillGapSlot(this.userGapAnswers, word);
  }

  resetGap(): void {
    this.userGapAnswers = this.resetGapSlots(3) as string[];
  }

  submitGap(): void {
    const correct = ['validate', 'listen', 'gentle'];
    if (JSON.stringify(this.userGapAnswers) === JSON.stringify(correct)) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.gapWrongAttempts = 0;
      this.recordPuzzleScore('Fill the Gap', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
      this.currentState = GameState.Puzzle3_Pattern;
      this.updateBackground();
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
          this.currentState = GameState.Puzzle3_Pattern;
          this.updateBackground();
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.fillGap.feedback.wrong');
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
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
        this.currentState = GameState.Completion;
        this.showDialogue({ character: this.t('characters.coach.name'), text: this.t('characters.coach.dialogues.patternComplete'), id: 'coach_patternComplete' });
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
            this.currentState = GameState.Completion;
            this.showDialogue({ character: this.t('characters.coach.name'), text: this.t('characters.coach.dialogues.patternComplete'), id: 'coach_patternComplete' });
          }
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = hint;
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Skip Puzzle Methods ---
  skipPuzzle1(): void {
    this.recordPuzzleScore('Matching', 99, true);
    this.puzzleFeedback = '';
    this.isPuzzleWrong = false;
    this.solvedMatches = ['1', '2', '3', '4'];
    this.currentState = GameState.Puzzle1_Complete;
    setTimeout(() => this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.allCorrect'), id: 'system_nextTask' }), ESCAPE_ROOM_TIMING.completionTransitionDelay);
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Fill the Gap', 99, true);
    this.puzzleFeedback = '';
    this.isPuzzleWrong = false;
    this.currentState = GameState.Puzzle3_Pattern;
    this.updateBackground();
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Pattern Recognition', 99, true);
    this.puzzleFeedback = '';
    this.isPuzzleWrong = false;
    this.currentState = GameState.Completion;
    this.showDialogue({ character: this.t('characters.coach.name'), text: this.t('characters.coach.dialogues.patternComplete'), id: 'coach_patternComplete' });
  }
}

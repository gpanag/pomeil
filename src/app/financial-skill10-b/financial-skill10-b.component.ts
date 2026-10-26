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
// --- Interfaces and Enums ---
enum GameState {
  Introduction,
  Introduction_Part2,
  Introduction_Part3,
  FindCard,
  CardFound,
  CardFound_Part2,
  CardFound_Part3,
  CardFound_Part4,
  CardFound_Part5,
  PuzzleOne, // Matching puzzle
  PuzzleOneComplete,
  FindReflection,
  ReflectionFound,
  PuzzleTwo, // Fill-the-gap
  PuzzleTwoComplete,
  PuzzleThree, // Pattern Recognition - Scenario 1
  PuzzleThree_Scenario2,
  PuzzleThree_Scenario3,
  AllQuestsComplete,
  AllQuestsComplete_Part2,
  AllQuestsComplete_Part3,
  AllQuestsComplete_Part4
}

interface MatchItem { id: string; text: string; matched?: boolean; }

// --- Asset Paths ---
const imagePaths = {
  base: '/assets/images/financial/accountant_office_base.png',
  aminaHover: '/assets/images/financial/amina_hover.png',
  danielHover: '/assets/images/financial/daniel_hover.png',
  aminaHover_door_open: '/assets/images/financial/amina_hover_door_open.png',
  danielHover_door_open: '/assets/images/financial/daniel_hover_door_open.png',
  aminaTalking: '/assets/images/financial/amina_talking.png',
  danielTalking: '/assets/images/financial/daniel_talking.png',
  aminaQuiz: '/assets/images/financial/amina_quiz.png',
  deskZoomed: '/assets/images/financial/desk_zoomed.png',
  filingCabinetZoomed: '/assets/images/financial/filing_cabinet_zoomed.png',
  filingCabinetZoomed_open: '/assets/images/financial/filing_cabinet_open.png',
  drawerZoomed: '/assets/images/financial/drawer_zoomed.png',
  drawerZoomed_open: '/assets/images/financial/drawer_open.png',
  boxUnderDeskZoomed: '/assets/images/financial/box_under_desk.png',
  // TODO(image): the dedicated open-box render is missing (box_under_desk_open.png
  // 404s). Fall back to the closed-box zoom so the box-open state isn't a broken
  // image; replace with a generated open-box image when the GPU pipeline is run.
  boxUnderDeskZoomed_open: '/assets/images/financial/box_under_desk.png',
  whiteboardZoomed: '/assets/images/financial/whiteboard_zoomed.png',
  safeBoxZoomed: '/assets/images/financial/safe_box_zoomed.png',
  budgetCard: '/assets/images/financial/budget_card.png',
  reflectionStrip: '/assets/images/financial/reflection_strip.png',
  base_door_open: '/assets/images/financial/accountant_office_door_open.png',
  daniel_thumbs_up: '/assets/images/financial/daniel_thumbs_up.png',
};

const roomConfig: EscapeRoomConfig = {
  roomId: 'financial',
  typewriterSpeed: 30,
  defaultZoomLevel: 3.0,
  characterZoomLevel: 1.5,
  preloadDoorSound: true,
};

@Component({
    selector: 'app-financial-skill10-b',
    templateUrl: './financial-skill10-b.component.html',
    styleUrl: './financial-skill10-b.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class FinancialSkill10BComponent extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  // TrackBy functions to prevent DOM recreation from getter-backed *ngFor
  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;

  override get config(): EscapeRoomConfig { return roomConfig; }

  hotspots = {
    mainView: {
      amina: { x: 30, y: 35, width: 20, height: 45 },
      daniel: { x: 65, y: 20, width: 20, height: 55 },
      desk: { x: 1, y: 73, width: 77, height: 25 },
      filingCabinet: { x: 55, y: 40, width: 10, height: 30 },
      drawer: { x: 20, y: 55, width: 12, height: 20 },
      boxUnderDesk: { x: 45, y: 72, width: 12, height: 10 },
      whiteboard: { x: 45, y: 25, width: 18, height: 20 },
      safeBox: { x: 35, y: 20, width: 12, height: 12 },
      exitDoor: { x: 80, y: 10, width: 10, height: 80 },
    },
    deskView: {
      laptop: { x: 40, y: 30, width: 30, height: 30 },
      calculator: { x: 78, y: 47, width: 15, height: 15 },
    },
    filingCabinetView: { open: { x: 65, y: 30, width: 25, height: 70 } },
    drawerView: { open: { x: 63, y: 45, width: 25, height: 20 } },
    boxView: { open: { x: 40, y: 35, width: 25, height: 30 } },
    whiteboardView: { message: { x: 15, y: 20, width: 70, height: 60 } },
    safeBoxView: { lock: { x: 40, y: 40, width: 20, height: 20 } },
    filingCabinetBottomView: { reflectionStrip: { x: 45, y: 45, width: 20, height: 20 } },
  };

  // Puzzle One: Matching
  get matchingTerms(): MatchItem[] {
    return [
      { id: '1', text: this.t('puzzles.matching.terms.0.text') },
      { id: '2', text: this.t('puzzles.matching.terms.1.text') },
      { id: '3', text: this.t('puzzles.matching.terms.2.text') },
      { id: '4', text: this.t('puzzles.matching.terms.3.text') },
    ];
  }
  get matchingMeanings(): MatchItem[] {
    return [
      { id: 'a', text: this.t('puzzles.matching.meanings.0.text') },
      { id: 'b', text: this.t('puzzles.matching.meanings.1.text') },
      { id: 'c', text: this.t('puzzles.matching.meanings.2.text') },
      { id: 'd', text: this.t('puzzles.matching.meanings.3.text') },
    ];
  }
  correctMatches: { [key: string]: string } = { '1': 'b', '2': 'a', '3': 'd', '4': 'c' };
  selectedTerm: string | null = null;
  selectedMeaning: string | null = null;
  userMatches: { [key: string]: string } = {};
  matchingFeedback: string = '';
  matchingWrongAttempts: number = 0;
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;

  // Puzzle Two: Fill-the-gap
  get fillGapSentence(): string {
    return this.t('puzzles.fillGap.sentence');
  }
  get fillGapOptions(): string[] {
    return [
      this.t('puzzles.fillGap.options.0'),
      this.t('puzzles.fillGap.options.1'),
      this.t('puzzles.fillGap.options.2'),
      this.t('puzzles.fillGap.options.3'),
      this.t('puzzles.fillGap.options.4'),
    ];
  }
  fillGapAnswers: string[] = [];
  get correctFillGapAnswers(): string[] {
    return [
      this.t('puzzles.fillGap.correct.0'),
      this.t('puzzles.fillGap.correct.1'),
      this.t('puzzles.fillGap.correct.2'),
    ];
  }
  fillGapFeedback: string = '';
  fillGapWrongAttempts: number = 0;
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;

  // Puzzle Three: Pattern Recognition
  get patternScenarios() {
    return [
      {
        question: this.t('puzzles.pattern.scenarios.0.question'),
        options: [
          this.t('puzzles.pattern.scenarios.0.options.0'),
          this.t('puzzles.pattern.scenarios.0.options.1'),
          this.t('puzzles.pattern.scenarios.0.options.2'),
          this.t('puzzles.pattern.scenarios.0.options.3'),
        ],
        correct: this.t('puzzles.pattern.scenarios.0.correct'),
        hint: this.t('puzzles.pattern.scenarios.0.hint'),
      },
      {
        question: this.t('puzzles.pattern.scenarios.1.question'),
        options: [
          this.t('puzzles.pattern.scenarios.1.options.0'),
          this.t('puzzles.pattern.scenarios.1.options.1'),
          this.t('puzzles.pattern.scenarios.1.options.2'),
          this.t('puzzles.pattern.scenarios.1.options.3'),
        ],
        correct: this.t('puzzles.pattern.scenarios.1.correct'),
        hint: this.t('puzzles.pattern.scenarios.1.hint'),
      },
      {
        question: this.t('puzzles.pattern.scenarios.2.question'),
        options: [
          this.t('puzzles.pattern.scenarios.2.options.0'),
          this.t('puzzles.pattern.scenarios.2.options.1'),
          this.t('puzzles.pattern.scenarios.2.options.2'),
          this.t('puzzles.pattern.scenarios.2.options.3'),
        ],
        correct: this.t('puzzles.pattern.scenarios.2.correct'),
        hint: this.t('puzzles.pattern.scenarios.2.hint'),
      }
    ];
  }
  currentScenarioIndex: number = 0;
  patternFeedback: string = '';
  patternWrongAttempts: number = 0;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  currentState: GameState = GameState.Introduction;

  // Zoomed states
  isDeskZoomed: boolean = false;
  isFilingCabinetZoomed: boolean = false;
  isFilingCabinetOpened: boolean = false;
  isDrawerZoomed: boolean = false;
  isDrawerOpened: boolean = false;
  isBoxZoomed: boolean = false;
  isBoxOpened: boolean = false;
  isWhiteboardZoomed: boolean = false;
  isSafeBoxZoomed: boolean = false;
  isFilingCabinetBottomZoomed: boolean = false;

  isCardVisible: boolean = false;
  isReflectionVisible: boolean = false;
  isQuizWrong: boolean = false;
  isPuzzleCompleteOverlayVisible: boolean = false;

  quizFeedback: string = '';
  quizPositionClass: string = 'center';

  hasFoundCard: boolean = false;
  hasFoundReflection: boolean = false;
  questStep: number = 0;

  override get characterImages(): CharacterImageMap {
    return {
      amina: { hover: imagePaths.aminaHover, hoverDoorOpen: imagePaths.aminaHover_door_open },
      daniel: { hover: imagePaths.danielHover, hoverDoorOpen: imagePaths.danielHover_door_open },
    };
  }

  public override get isMainViewActive(): boolean {
    return !this.isDeskZoomed && !this.isFilingCabinetZoomed && !this.isDrawerZoomed &&
           !this.isBoxZoomed && !this.isWhiteboardZoomed && !this.isSafeBoxZoomed &&
           !this.isFilingCabinetBottomZoomed;
  }

  public override get isQuizActive(): boolean {
    return this.currentState === GameState.PuzzleOne ||
           this.currentState === GameState.PuzzleTwo ||
           this.currentState === GameState.PuzzleThree ||
           this.currentState === GameState.PuzzleThree_Scenario2 ||
           this.currentState === GameState.PuzzleThree_Scenario3;
  }

  public get currentScenario() {
    return this.patternScenarios[this.currentScenarioIndex];
  }

  public get completedMatchCount(): number {
    return Object.keys(this.userMatches).length;
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
    this.currentState = GameState.Introduction;
    this.preloadImages(Object.values(imagePaths));
  }

  // --- Background ---
  override updateBackground(): void {
    if (this.currentState === GameState.AllQuestsComplete ||
        this.currentState === GameState.AllQuestsComplete_Part2 ||
        this.currentState === GameState.AllQuestsComplete_Part3 ||
        this.currentState === GameState.AllQuestsComplete_Part4) {
      this.currentBackgroundUrl = imagePaths.base_door_open;
      return;
    }

    if (this.isQuizActive) {
      this.currentBackgroundUrl = imagePaths.aminaQuiz;
    }
    else if (this.isDeskZoomed) {
      this.currentBackgroundUrl = imagePaths.deskZoomed;
    }
    else if (this.isFilingCabinetZoomed) {
      this.currentBackgroundUrl = this.isFilingCabinetOpened ? imagePaths.filingCabinetZoomed_open : imagePaths.filingCabinetZoomed;
    }
    else if (this.isFilingCabinetBottomZoomed) {
      this.currentBackgroundUrl = imagePaths.filingCabinetZoomed_open;
    }
    else if (this.isDrawerZoomed) {
      this.currentBackgroundUrl = this.isDrawerOpened ? imagePaths.drawerZoomed_open : imagePaths.drawerZoomed;
    }
    else if (this.isBoxZoomed) {
      this.currentBackgroundUrl = this.isBoxOpened ? imagePaths.boxUnderDeskZoomed_open : imagePaths.boxUnderDeskZoomed;
    }
    else if (this.isWhiteboardZoomed) {
      this.currentBackgroundUrl = imagePaths.whiteboardZoomed;
    }
    else if (this.isSafeBoxZoomed) {
      this.currentBackgroundUrl = imagePaths.safeBoxZoomed;
    }
    else if (this.isDoorOpen) {
      this.currentBackgroundUrl = imagePaths.base_door_open;
    }
    else {
      this.currentBackgroundUrl = imagePaths.base;
    }
  }


  onCharacterClick(character: 'amina' | 'daniel'): void {
    this.playSound('character-click.wav');
    let dialogueText = '';
    let dialogueCharacter = '';

    if (character === 'daniel') {
      dialogueCharacter = this.t('characters.daniel.name');
      this.currentBackgroundUrl = imagePaths.danielTalking;

      if (this.currentState === GameState.AllQuestsComplete ||
          this.currentState === GameState.AllQuestsComplete_Part2 ||
          this.currentState === GameState.AllQuestsComplete_Part3 ||
          this.currentState === GameState.AllQuestsComplete_Part4) {
        this.currentBackgroundUrl = imagePaths.daniel_thumbs_up;
        dialogueText = this.t('characters.daniel.dialogues.allQuestsComplete');
      } else {
        dialogueText = this.t('characters.daniel.dialogues.default');
      }
      this.showDialogue({ character: dialogueCharacter, text: dialogueText });
    }

    if (character === 'amina') {
      dialogueCharacter = this.t('characters.amina.name');
      this.currentBackgroundUrl = imagePaths.aminaTalking;

      switch (this.currentState) {
        case GameState.Introduction:
          dialogueText = this.t('characters.amina.dialogues.introduction');
          break;
        case GameState.FindCard:
          dialogueText = this.t('characters.amina.dialogues.findCard');
          break;
        case GameState.CardFound:
          dialogueText = this.t('characters.amina.dialogues.cardFound');
          break;
        case GameState.PuzzleOneComplete:
          dialogueText = this.t('characters.amina.dialogues.puzzleOneComplete');
          break;
        case GameState.FindReflection:
          dialogueText = this.t('characters.amina.dialogues.findReflection');
          break;
        case GameState.ReflectionFound:
          dialogueText = this.t('characters.amina.dialogues.reflectionFound');
          break;
        case GameState.PuzzleOne:
        case GameState.PuzzleTwo:
        case GameState.PuzzleThree:
        case GameState.PuzzleThree_Scenario2:
        case GameState.PuzzleThree_Scenario3:
          dialogueText = this.t('characters.amina.dialogues.duringPuzzle');
          break;
        case GameState.AllQuestsComplete:
        case GameState.AllQuestsComplete_Part2:
        case GameState.AllQuestsComplete_Part3:
        case GameState.AllQuestsComplete_Part4:
          if (this.isDoorOpen) {
            dialogueText = this.t('characters.amina.dialogues.doorOpen') || 'Great work! Click on the open door to exit.';
          } else {
            dialogueText = this.t('characters.amina.dialogues.allQuestsComplete');
          }
          break;
        default:
          dialogueText = this.t('characters.amina.dialogues.default');
      }
      this.showDialogue({ character: dialogueCharacter, text: dialogueText });
    }
  }

  // --- Hotspot clicks ---
  override onHotspotClick(hotspot: string): void {
    this.dismissDialogue();

    if (hotspot === 'exitDoor' && (this.currentState === GameState.AllQuestsComplete_Part4 || this.isDoorOpen)) {
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
      return;
    }

    if (this.isMainViewActive) {
      this.zoomToLocation(hotspot, this.hotspots.mainView, () => {
        if (this.currentState === GameState.FindCard) {
          if (hotspot === 'desk') this.isDeskZoomed = true;
          else if (hotspot === 'filingCabinet') this.isFilingCabinetZoomed = true;
          else if (hotspot === 'drawer') this.isDrawerZoomed = true;
          else if (hotspot === 'boxUnderDesk') this.isBoxZoomed = true;
        }
        else if (this.currentState === GameState.FindReflection || this.currentState === GameState.PuzzleOneComplete) {
          if (hotspot === 'whiteboard') this.isWhiteboardZoomed = true;
          else if (hotspot === 'safeBox') this.isSafeBoxZoomed = true;
          else if (hotspot === 'filingCabinet') this.isFilingCabinetBottomZoomed = true;
        }

        this.updateBackground();
        this.resetZoom(true);
      });
      return;
    }

    // Handle zoomed view clicks
    if (this.currentState === GameState.FindCard) {
      if (hotspot === 'zoomedDeskLaptop' || hotspot === 'zoomedDeskCalculator') {
        this.questStep = 1;
        this.showDialogue({ character: '', text: this.t('exploration.findCard.deskLaptopCalculator') });
      }
      else if (hotspot === 'zoomedFilingCabinetClick') {
        this.playSound('folder-search.wav');
        this.isFilingCabinetOpened = true;
        this.updateBackground();
        this.questStep = 2;
        this.showDialogue({ character: '', text: this.t('exploration.findCard.filingCabinet') });
      }
      else if (hotspot === 'zoomedDrawerClick') {
        this.playSound('drawer-search.wav');
        this.isDrawerOpened = true;
        this.updateBackground();
        this.questStep = 3;
        this.showDialogue({ character: '', text: this.t('exploration.findCard.drawer') });
      }
      else if (hotspot === 'zoomedBoxClick') {
        this.playSound('success-chime.wav');
        this.playSound('paper-rustle.wav');
        this.isBoxOpened = true;
        this.isCardVisible = true;
        this.updateBackground();
      }
    }
    else if (this.currentState === GameState.FindReflection || this.currentState === GameState.PuzzleOneComplete) {
      if (hotspot === 'zoomedWhiteboardMessage') {
        this.questStep = 1;
        this.showDialogue({ character: '', text: this.t('exploration.findReflection.whiteboard') });
      }
      else if (hotspot === 'zoomedSafeBoxLock') {
        this.questStep = 2;
        this.showDialogue({ character: '', text: this.t('exploration.findReflection.safeBox') });
      }
      else if (hotspot === 'zoomedFilingCabinetBottom') {
        this.playSound('success-chime.wav');
        this.playSound('paper-rustle.wav');
        this.isReflectionVisible = true;
      }
    }
  }

  protected override resetZoomState(): void {
    this.isDeskZoomed = false;
    this.isFilingCabinetZoomed = false;
    this.isDrawerZoomed = false;
    this.isBoxZoomed = false;
    this.isWhiteboardZoomed = false;
    this.isSafeBoxZoomed = false;
    this.isFilingCabinetBottomZoomed = false;
    // Don't reset opened states - keep them for visual continuity
  }

  // --- Matching Puzzle Logic ---
  selectTerm(termId: string): void {
    if (this.userMatches[termId]) return; // Already matched
    this.selectedTerm = termId;
    this.tryMatch();
  }

  selectMeaning(meaningId: string): void {
    if (Object.values(this.userMatches).includes(meaningId)) return; // Already matched
    this.selectedMeaning = meaningId;
    this.tryMatch();
  }

  private tryMatch(): void {
    if (this.selectedTerm && this.selectedMeaning) {
      if (this.correctMatches[this.selectedTerm] === this.selectedMeaning) {
        this.playSound('success-chime.wav');
        this.userMatches[this.selectedTerm] = this.selectedMeaning;
        this.matchingFeedback = '';
        this.matchingWrongAttempts = 0;

        if (Object.keys(this.userMatches).length === 4) {
          // All matched!
          this.recordPuzzleScore('Matching', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
          this.isPuzzleCompleteOverlayVisible = true;
        }
      } else {
        this.playSound('error-buzz.mp3');
        this.isQuizWrong = true;
        this.matchingWrongAttempts++;
        this.puzzle1TotalWrong++;

        if (this.matchingWrongAttempts >= 3) {
          this.puzzle1WasRevealed = true;
          this.answerOverlayText = this.t('puzzles.matching.answerOverlay');
          this.answerOverlayCallback = () => {
            this.matchingWrongAttempts = 0;
            this.userMatches = { '1': 'b', '2': 'a', '3': 'd', '4': 'c' };
            this.recordPuzzleScore('Matching', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
            this.isPuzzleCompleteOverlayVisible = true;
          };
          this.showAnswerOverlay = true;
        } else {
          this.matchingFeedback = this.t('puzzles.matching.feedback');
        }

        setTimeout(() => this.isQuizWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
      }
      this.selectedTerm = null;
      this.selectedMeaning = null;
    }
  }

  isTermMatched(termId: string): boolean {
    return !!this.userMatches[termId];
  }

  isMeaningMatched(meaningId: string): boolean {
    return Object.values(this.userMatches).includes(meaningId);
  }

  // --- Fill the Gap Puzzle Logic ---
  selectFillGapOption(option: string): void {
    if (this.fillGapAnswers.length < 3 && !this.fillGapAnswers.includes(option)) {
      this.fillGapAnswers.push(option);
    }
  }

  removeFillGapAnswer(index: number): void {
    this.fillGapAnswers.splice(index, 1);
  }

  submitFillGap(): void {
    this.fillGapFeedback = '';
    this.isQuizWrong = false;

    if (JSON.stringify(this.fillGapAnswers) === JSON.stringify(this.correctFillGapAnswers)) {
      this.playSound('success-chime.wav');
      this.recordPuzzleScore('Fill the Gap', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
      this.fillGapWrongAttempts = 0;
      this.currentState = GameState.PuzzleTwoComplete;
      this.currentScenarioIndex = 0;
      setTimeout(() => {
        this.currentState = GameState.PuzzleThree;
        this.quizPositionClass = 'center';
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isQuizWrong = true;
      this.fillGapWrongAttempts++;
      this.puzzle2TotalWrong++;

      if (this.fillGapWrongAttempts >= 3) {
        this.puzzle2WasRevealed = true;
        this.fillGapAnswers = [...this.correctFillGapAnswers];
        this.answerOverlayText = this.t('puzzles.fillGap.answerOverlay');
        this.answerOverlayCallback = () => {
          this.fillGapWrongAttempts = 0;
          this.recordPuzzleScore('Fill the Gap', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
          this.currentState = GameState.PuzzleTwoComplete;
          this.currentScenarioIndex = 0;
          setTimeout(() => {
            this.currentState = GameState.PuzzleThree;
            this.quizPositionClass = 'center';
          }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.fillGapFeedback = this.t('puzzles.fillGap.feedback');
      }

      setTimeout(() => this.isQuizWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  resetFillGap(): void {
    this.fillGapAnswers = [];
    this.fillGapFeedback = '';
  }

  getDisplayedSentence(): string {
    let sentence = this.fillGapSentence;
    const placeholders = ['(___)', '(___)', '(___)'];
    for (let i = 0; i < 3; i++) {
      const answer = this.fillGapAnswers[i] || '___';
      sentence = sentence.replace(placeholders[0], `[${answer}]`);
    }
    return sentence;
  }

  // --- Pattern Recognition Puzzle Logic ---
  submitPatternAnswer(answer: string): void {
    this.patternFeedback = '';
    this.isQuizWrong = false;

    if (answer === this.currentScenario.correct) {
      this.playSound('success-chime.wav');
      this.patternWrongAttempts = 0;

      if (this.currentScenarioIndex === 0) {
        this.currentState = GameState.PuzzleThree_Scenario2;
        this.currentScenarioIndex = 1;
      } else if (this.currentScenarioIndex === 1) {
        this.currentState = GameState.PuzzleThree_Scenario3;
        this.currentScenarioIndex = 2;
      } else {
        // All scenarios complete!
        this.recordPuzzleScore('Pattern Recognition', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
        this.currentState = GameState.AllQuestsComplete;
        this.showDialogue({
          character: this.t('characters.amina.name'),
          text: this.t('characters.amina.dialogues.allQuestsComplete')
        });
      }
    } else {
      this.playSound('error-buzz.mp3');
      this.isQuizWrong = true;
      this.patternWrongAttempts++;
      this.puzzle3TotalWrong++;

      if (this.patternWrongAttempts >= 3) {
        this.puzzle3WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.pattern.answerOverlayTemplate')
          .replace('{{question}}', this.currentScenario.question)
          .replace('{{correct}}', this.currentScenario.correct)
          .replace('{{hint}}', this.currentScenario.hint);
        this.answerOverlayCallback = () => {
          this.patternWrongAttempts = 0;
          if (this.currentScenarioIndex === 0) {
            this.currentState = GameState.PuzzleThree_Scenario2;
            this.currentScenarioIndex = 1;
          } else if (this.currentScenarioIndex === 1) {
            this.currentState = GameState.PuzzleThree_Scenario3;
            this.currentScenarioIndex = 2;
          } else {
            this.recordPuzzleScore('Pattern Recognition', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
            this.currentState = GameState.AllQuestsComplete;
            this.showDialogue({
              character: this.t('characters.amina.name'),
              text: this.t('characters.amina.dialogues.allQuestsComplete')
            });
          }
        };
        this.showAnswerOverlay = true;
      } else {
        this.patternFeedback = this.currentScenario.hint;
      }

      setTimeout(() => this.isQuizWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  closePuzzleCompleteOverlay(): void {
    this.isPuzzleCompleteOverlayVisible = false;
    this.currentState = GameState.PuzzleOneComplete;
    this.questStep = 0;
    this.showDialogue({ character: '', text: this.t('puzzles.matching.completeAfterDialogue') });
  }

  override closeAnswerOverlay(): void {
    this.showAnswerOverlay = false;
    this.patternFeedback = '';
    this.fillGapFeedback = '';
    if (this.answerOverlayCallback) {
      this.answerOverlayCallback();
      this.answerOverlayCallback = null;
    }
  }

  // --- Dialogue dismissal ---
  override dismissDialogue(): void {
    if (!this.activeDialogue) return;

    const character = this.activeDialogue.character;
    const state = this.currentState;

    if (character === '' && this.showHints) {
      this.showHintPulse();
    }

    this.activeDialogue = null;
    this.isTyping = false;
    if (this.dialogueInterval) clearInterval(this.dialogueInterval);

    if (character !== '') {
      this.resetZoom();
    }

    // State progression
    const aminaName = this.t('characters.amina.name');

    if (character === aminaName && state === GameState.Introduction) {
      this.currentState = GameState.Introduction_Part2;
      this.showDialogue({
        character: aminaName,
        text: this.t('characters.amina.dialogues.introduction_part2')
      });
      return;
    }
    if (character === aminaName && state === GameState.Introduction_Part2) {
      this.currentState = GameState.Introduction_Part3;
      this.showDialogue({
        character: aminaName,
        text: this.t('characters.amina.dialogues.introduction_part3')
      });
      return;
    }
    if (character === aminaName && state === GameState.Introduction_Part3) {
      this.currentState = GameState.FindCard;
      this.questStep = 0;
      // Restore the room background — onCharacterClick switched it to amina_talking
      // while she spoke; the intro chain is over, so revert to the base scene.
      this.updateBackground();
      // Pulse the desk hotspot so the player sees immediately where to look
      this.showHints = true;
      this.showHintPulse();
      return;
    }

    if (character === aminaName && state === GameState.CardFound) {
      this.currentState = GameState.CardFound_Part2;
      this.showDialogue({
        character: aminaName,
        text: this.t('characters.amina.dialogues.cardFound_part2')
      });
      return;
    }
    if (character === aminaName && state === GameState.CardFound_Part2) {
      this.currentState = GameState.CardFound_Part3;
      this.showDialogue({
        character: aminaName,
        text: this.t('characters.amina.dialogues.cardFound_part3')
      });
      return;
    }
    if (character === aminaName && state === GameState.CardFound_Part3) {
      this.currentState = GameState.CardFound_Part4;
      this.showDialogue({
        character: aminaName,
        text: this.t('characters.amina.dialogues.cardFound_part4')
      });
      return;
    }
    if (character === aminaName && state === GameState.CardFound_Part4) {
      this.startMatchingPuzzle();
      return;
    }

    if (character === aminaName && state === GameState.PuzzleOneComplete) {
      this.currentState = GameState.FindReflection;
      this.questStep = 0;
      // Revert amina_talking → base scene now that the post-puzzle chat is over.
      this.updateBackground();
      return;
    }

    if (character === aminaName && state === GameState.ReflectionFound) {
      this.startFillGapPuzzle();
      return;
    }

    if (character === aminaName && state === GameState.AllQuestsComplete) {
      this.currentState = GameState.AllQuestsComplete_Part2;
      this.showDialogue({
        character: aminaName,
        text: this.t('characters.amina.dialogues.allQuestsComplete_part2')
      });
      return;
    }
    if (character === aminaName && state === GameState.AllQuestsComplete_Part2) {
      this.currentState = GameState.AllQuestsComplete_Part3;
      this.showDialogue({
        character: aminaName,
        text: this.t('characters.amina.dialogues.allQuestsComplete_part3')
      });
      return;
    }
    if (character === aminaName && state === GameState.AllQuestsComplete_Part3) {
      this.currentState = GameState.AllQuestsComplete_Part4;
      this.showDialogue({
        character: aminaName,
        text: this.t('characters.amina.dialogues.allQuestsComplete_part4')
      });
      return;
    }
    if (character === aminaName && state === GameState.AllQuestsComplete_Part4 && !this.isDoorOpen) {
      this.isDoorOpen = true;
      this.playDoorSound();
      this.updateBackground();
      return;
    }

    this.updateBackground();
  }

  // --- Hint ---
  protected override getHintText(): string {
    if (this.currentState === GameState.FindCard) {
      if (this.questStep === 0) return this.t('hints.findCard.step0');
      else if (this.questStep === 1) return this.t('hints.findCard.step1');
      else if (this.questStep === 2) return this.t('hints.findCard.step2');
      else return this.t('hints.findCard.step3');
    } else if (this.currentState === GameState.PuzzleOneComplete || this.currentState === GameState.FindReflection) {
      if (this.questStep === 0) return this.t('hints.findReflection.step0');
      else if (this.questStep === 1) return this.t('hints.findReflection.step1');
      else return this.t('hints.findReflection.step2');
    } else if (this.currentState === GameState.AllQuestsComplete ||
               this.currentState === GameState.AllQuestsComplete_Part2 ||
               this.currentState === GameState.AllQuestsComplete_Part3 ||
               this.currentState === GameState.AllQuestsComplete_Part4) {
      return this.t('hints.allQuestsComplete');
    }
    return this.t('hints.defaultHint');
  }

  protected override onHintRequested(): void {
    // If the player is inside a zoomed view, return to main view first so the hint pulse is visible on the active hotspot.
    if (!this.isMainViewActive) {
      this.goBack();
    }
  }

  startMatchingPuzzle(): void {
    this.activeDialogue = null;
    this.userMatches = {};
    this.selectedTerm = null;
    this.selectedMeaning = null;
    this.matchingFeedback = '';
    this.currentState = GameState.PuzzleOne;
    this.updateBackground();
    this.quizPositionClass = 'center';
  }

  startFillGapPuzzle(): void {
    this.activeDialogue = null;
    this.fillGapAnswers = [];
    this.fillGapFeedback = '';
    this.currentState = GameState.PuzzleTwo;
    this.updateBackground();
    this.quizPositionClass = 'center';
  }

  closeCard(): void {
    this.isCardVisible = false;
    if (!this.hasFoundCard) {
      this.hasFoundCard = true;
      this.currentState = GameState.CardFound;
      this.goBack();
      this.showDialogue({ character: '', text: this.t('items.card.foundDialogue') });
    }
  }

  closeReflection(): void {
    this.isReflectionVisible = false;
    if (!this.hasFoundReflection) {
      this.hasFoundReflection = true;
      this.currentState = GameState.ReflectionFound;
      this.goBack();
      this.showDialogue({ character: '', text: this.t('items.reflection.foundDialogue') });
    }
  }

  toggleCard(): void {
    if (this.hasFoundCard) {
      this.playSound('paper-rustle.wav');
      this.isCardVisible = !this.isCardVisible;
      this.isReflectionVisible = false;
    }
  }

  toggleReflection(): void {
    if (this.hasFoundReflection) {
      this.playSound('paper-rustle.wav');
      this.isReflectionVisible = !this.isReflectionVisible;
      this.isCardVisible = false;
    }
  }

  // --- Skip Puzzle Methods ---
  skipPuzzle1(): void {
    this.recordPuzzleScore('Matching', 99, true);
    this.isPuzzleCompleteOverlayVisible = true;
    this.matchingFeedback = '';
    this.isQuizWrong = false;
    this.userMatches = { '1': 'b', '2': 'a', '3': 'd', '4': 'c' };
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Fill the Gap', 99, true);
    this.fillGapFeedback = '';
    this.isQuizWrong = false;
    this.currentState = GameState.PuzzleTwoComplete;
    this.currentScenarioIndex = 0;
    setTimeout(() => {
      this.currentState = GameState.PuzzleThree;
      this.quizPositionClass = 'center';
    }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Pattern Recognition', 99, true);
    this.patternFeedback = '';
    this.isQuizWrong = false;
    this.currentState = GameState.AllQuestsComplete;
    this.showDialogue({
      character: this.t('characters.amina.name'),
      text: this.t('characters.amina.dialogues.allQuestsComplete')
    });
  }
}

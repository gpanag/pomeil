import { Component, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { EscapeRoomBaseComponent } from '../shared/escape-room/escape-room-base.component';
import { EscapeRoomTextService } from '../shared/escape-room/escape-room-text.service';
import { fadeInOut } from '../shared/escape-room/escape-room.animations';
import { Dialogue, EscapeRoomConfig, CharacterImageMap, ESCAPE_ROOM_TIMING } from '../shared/escape-room/escape-room.interfaces';

interface MatchingRow { id: '1' | '2' | '3' | '4'; text: string; }

enum GameState {
  Introduction,
  FindNote,
  NoteFound,
  NoteFound_Part2,
  NoteFound_Part3,
  NoteFound_Part4,

  Quiz,                 // Puzzle 1 (multiple choice)
  QuizComplete,

  FindUsb,              // Find Sofia's USB stick
  UsbFound,
  UsbFound_Part2,

  ReadTrainingFile,     // Open "TRAINING" on laptop
  ReadTrainingFileDone,

  PuzzleTwo,            // Puzzle 2 (matching)
  PuzzleTwoComplete,

  PuzzleThree,          // Puzzle 3 (sequence)
  AllQuestsComplete,
  AllQuestsComplete_Part2,
  AllQuestsComplete_Part3,
}

const imagePaths = {
  // MAIN ROOM (provide your own renders with the same naming)
  base: '/assets/images/strategic/base_room.png',
  base_door_open: '/assets/images/strategic/base_room_door_open.png',

  // HOVER / TALKING VARIANTS (optional but recommended)
  jakeHover: '/assets/images/strategic/jake_hover.png',
  sofiaHover: '/assets/images/strategic/sofia_hover.png',
  jakeTalking: '/assets/images/strategic/jake_talking.png',
  sofiaTalking: '/assets/images/strategic/sofia_talking.png',

  //HOVER OPEN DOOR
  sofiHoverOpenDoor: '/assets/images/strategic/sofia_hover_open_door.png',
  jakeHoverOpenDoor: '/assets/images/strategic/jake_hover_open_door.png',

  // ZOOM SCENES
  leftCorkboardZoomed: '/assets/images/strategic/corkboard_left_zoom.png',
  rightCorkboardZoomed: '/assets/images/strategic/corkboard_right_zoom.png',
  coffeeZoomed: '/assets/images/strategic/coffee_zoom.png',
  laptopZoomed: '/assets/images/strategic/laptop_zoom.png',

  // VISUAL AIDS / ITEMS
  blueNote: '/assets/images/strategic/blue_note.png',
  trainingFileBg: '/assets/images/strategic/training_file_bg.png',
  usb: '/assets/images/strategic/usb_red.png',
};

const roomConfig: EscapeRoomConfig = {
  roomId: 'strategic-thinking',
  typewriterSpeed: 18,
  defaultZoomLevel: 3.0,
  characterZoomLevel: 1.5,
  preloadDoorSound: true,
};

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
  ],
  selector: 'app-strategic-thinking-skill16',
  templateUrl: './strategic-thinking-skill16.component.html',
  styleUrl: './strategic-thinking-skill16.component.scss',
  animations: [fadeInOut],
})
export class StrategicThinkingSkill16Component extends EscapeRoomBaseComponent {
  public GameState = GameState;
  public imagePaths = imagePaths;

  override get config(): EscapeRoomConfig { return roomConfig; }

  get introParagraphs(): string[] {
    const paragraphs = this.texts?.['intro']?.['paragraphs'];
    if (!Array.isArray(paragraphs)) return [];
    // Route each paragraph through t() so <username>/(username) tokens get substituted.
    return paragraphs.map((_, i) => this.t(`intro.paragraphs.${i}`));
  }

  // --- Game / scene state
  currentState: GameState = GameState.Introduction;

  // zoom flags (scene switching)
  isLeftBoardZoomed = false;
  isRightBoardZoomed = false;
  isCoffeeZoomed = false;
  isLaptopZoomed = false;

  // overlays / inventory
  isBlueNoteVisible = false;
  isUsbVisible = false;
  isTrainingFileVisible = false;

  hasFoundBlueNote = false;
  hasFoundUsb = false;
  hasReadTrainingFile = false;

  /** True after Sofia has delivered her long welcome+USB explanation once.
   *  Subsequent clicks on her during FindUsb show a short follow-up instead
   *  of replaying the full speech (MMC Mavis feedback, 2026-05-09). */
  private sofiaIntroducedInFindUsb = false;

  // hint system (room-specific cooldown)
  private hintCooldown = false;
  private isHintDialogueActive = false;

  // quiz feedback (template uses isQuizWrong / quizFeedback)
  quizFeedback = '';
  isQuizWrong = false;
  quizPositionClass = 'center';

  // Puzzle 1 (multiple choice)
  get puzzle1() {
    return {
      title: this.t('puzzles.puzzleOne.title'),
      question: this.t('puzzles.puzzleOne.question'),
      options: [
        { key: 'a', text: this.t('puzzles.puzzleOne.options.a') },
        { key: 'b', text: this.t('puzzles.puzzleOne.options.b') },
        { key: 'c', text: this.t('puzzles.puzzleOne.options.c') },
        { key: 'd', text: this.t('puzzles.puzzleOne.options.d') },
      ],
      correct: 'b',
      hint: this.t('puzzles.puzzleOne.hint'),
    };
  }

  // Puzzle 2 (matching)
  get matchingRows(): MatchingRow[] {
    return [
      { id: '1', text: this.t('puzzles.matching.rows.1') },
      { id: '2', text: this.t('puzzles.matching.rows.2') },
      { id: '3', text: this.t('puzzles.matching.rows.3') },
      { id: '4', text: this.t('puzzles.matching.rows.4') },
    ];
  }
  get matchingOptions() {
    return [
      { id: 'A', text: this.t('puzzles.matching.options.A') },
      { id: 'B', text: this.t('puzzles.matching.options.B') },
      { id: 'C', text: this.t('puzzles.matching.options.C') },
      { id: 'D', text: this.t('puzzles.matching.options.D') },
    ];
  }
  matchingAnswerKey: Record<MatchingRow['id'], string> = { '1': 'D', '2': 'B', '3': 'A', '4': 'C' };
  matchingSelection: Partial<Record<MatchingRow['id'], string>> = {};
  matchingFeedback = '';

  // trackBy functions to prevent *ngFor from re-creating DOM elements
  // when getter-backed arrays return new references on each change detection
  trackById = (_: number, item: { id: string }) => item.id;
  trackByKey = (_: number, item: { key: string }) => item.key;

  // Puzzle 1 (multiple choice) - attempt tracking
  quiz1WrongAttempts = 0;
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;

  // Puzzle 2 (matching) - attempt tracking
  matchingWrongAttempts = 0;
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;

  // Puzzle 3 (sequence)
  get puzzleThreeOptions(): Record<string, string> {
    return {
      a: this.t('puzzles.sequence.options.a'),
      b: this.t('puzzles.sequence.options.b'),
      c: this.t('puzzles.sequence.options.c'),
      d: this.t('puzzles.sequence.options.d'),
    };
  }
  puzzleThreeCorrectSequence: string[] = ['b', 'c', 'a', 'd'];
  puzzleThreeSequence: string[] = [];
  puzzleThreeFeedback = '';
  sequenceWrongAttempts = 0;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  // overlay flags
  isQuizCompleteOverlayVisible = false;
  isMatchingCompleteOverlayVisible = false;

  // hotspots (percent-based)
  hotspots = {
    mainView: {
      jake: { x: 10, y: 25, width: 18, height: 70 },
      sofia: { x: 42, y: 25, width: 25, height: 60 },

      leftCorkboard: { x: 0, y: 28, width: 15, height: 30 },
      rightCorkboard: { x: 38, y: 35, width: 10, height: 20 },

      coffeeMachine: { x: 90, y: 62, width: 9, height: 20 },
      laptop: { x: 50, y: 58, width: 8, height: 10 },

      exitDoor: { x: 46, y: 38, width: 8, height: 20 },
    },
    leftBoardView: { blueNote: { x: 47, y: 72, width: 10, height: 12 } },
    rightBoardView: { anyNote: { x: 20, y: 20, width: 50, height: 50 } },
    coffeeView: { usb: { x: 55, y: 55, width: 12, height: 12 } },
    laptopView: { openTraining: { x: 32, y: 38, width: 30, height: 45 } },
  };

  override get characterImages(): CharacterImageMap {
    return {
      jake: { hover: imagePaths.jakeHover, hoverDoorOpen: imagePaths.jakeHoverOpenDoor },
      sofia: { hover: imagePaths.sofiaHover, hoverDoorOpen: imagePaths.sofiHoverOpenDoor },
    };
  }

  protected override canInteractWithCharacter(): boolean {
    return !this.isIntroPopupVisible && !this.activeDialogue && this.isMainViewActive && !this.isAnimating;
  }

  public override get isMainViewActive(): boolean {
    return !this.isLeftBoardZoomed && !this.isRightBoardZoomed && !this.isCoffeeZoomed && !this.isLaptopZoomed;
  }

  public override get isQuizActive(): boolean {
    return this.currentState === GameState.Quiz || this.currentState === GameState.PuzzleTwo || this.currentState === GameState.PuzzleThree;
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

  // -----------------------------
  // Intro
  // -----------------------------
  protected override onIntroPopupClosed(): void {
    this.showDialogue({
      character: '',
      text: this.t('systemDialogues.introSelfTalk'),
    });
  }

  // -----------------------------
  // Character click
  // -----------------------------
  onCharacterClick(character: 'jake' | 'sofia'): void {
    if (this.isIntroPopupVisible || this.activeDialogue || this.isAnimating) return;

    if (character === 'jake') this.handleJakeDialogue();
    if (character === 'sofia') this.handleSofiaDialogue();
  }

  private handleJakeDialogue(): void {
    this.currentBackgroundUrl = imagePaths.jakeTalking;

    switch (this.currentState) {
      case GameState.Introduction:
        this.showDialogue({
          character: this.t('characters.jake.name'),
          text: this.t('characters.jake.dialogues.introduction'),
        });
        break;

      case GameState.FindNote:
        this.showDialogue({ character: this.t('characters.jake.name'), text: this.t('characters.jake.dialogues.findNote') });
        break;

      case GameState.NoteFound:
        this.showDialogue({ character: this.t('characters.jake.name'), text: this.t('characters.jake.dialogues.noteFound') });
        break;

      case GameState.NoteFound_Part2:
        this.showDialogue({
          character: this.t('characters.jake.name'),
          text: this.t('characters.jake.dialogues.noteFoundPart2'),
        });
        break;

      case GameState.NoteFound_Part3:
        this.showDialogue({ character: this.t('characters.jake.name'), text: this.t('characters.jake.dialogues.noteFoundPart3') });
        break;

      case GameState.NoteFound_Part4:
        this.showDialogue({ character: this.t('characters.jake.name'), text: this.t('characters.jake.dialogues.noteFoundPart4') });
        break;

      case GameState.QuizComplete:
        this.showDialogue({
          character: this.t('characters.jake.name'),
          text: this.t('characters.jake.dialogues.quizComplete'),
        });
        break;

      case GameState.FindUsb:
        this.showDialogue({ character: this.t('characters.jake.name'), text: this.t('characters.jake.dialogues.findUsb') });
        break;

      case GameState.AllQuestsComplete:
      case GameState.AllQuestsComplete_Part2:
      case GameState.AllQuestsComplete_Part3:
        this.showDialogue({ character: this.t('characters.jake.name'), text: this.t('characters.jake.dialogues.allQuestsComplete') });
        break;

      default:
        this.showDialogue({ character: this.t('characters.jake.name'), text: this.t('characters.jake.dialogues.default') });
    }
  }

  private handleSofiaDialogue(): void {
    this.currentBackgroundUrl = imagePaths.sofiaTalking;

    switch (this.currentState) {
      case GameState.FindUsb:
        this.showDialogue({
          character: this.t('characters.sofia.name'),
          text: this.t(
            this.sofiaIntroducedInFindUsb
              ? 'characters.sofia.dialogues.findUsbFollowUp'
              : 'characters.sofia.dialogues.findUsb',
          ),
        });
        this.sofiaIntroducedInFindUsb = true;
        break;

      case GameState.UsbFound:
        this.showDialogue({
          character: this.t('characters.sofia.name'),
          text: this.t('characters.sofia.dialogues.usbFound'),
        });
        break;

      case GameState.ReadTrainingFileDone:
        this.showDialogue({
          character: this.t('characters.sofia.name'),
          text: this.t('characters.sofia.dialogues.readTrainingFileDone'),
        });
        break;

      case GameState.PuzzleTwoComplete:
        this.showDialogue({
          character: this.t('characters.sofia.name'),
          text: this.t('characters.sofia.dialogues.puzzleTwoComplete'),
        });
        break;

      case GameState.AllQuestsComplete:
      case GameState.AllQuestsComplete_Part2:
        this.showDialogue({
          character: this.t('characters.sofia.name'),
          text: this.t('characters.sofia.dialogues.allQuestsComplete'),
        });
        break;

      case GameState.AllQuestsComplete_Part3:
        // Door already opened — short send-off, not a replay of the full
        // training-complete speech (MMC Mavis feedback, 2026-05-09).
        this.showDialogue({
          character: this.t('characters.sofia.name'),
          text: this.t('characters.sofia.dialogues.farewell'),
        });
        break;

      default:
        this.showDialogue({ character: this.t('characters.sofia.name'), text: this.t('characters.sofia.dialogues.default') });
    }
  }

  // -----------------------------
  // Background
  // -----------------------------
  override updateBackground(): void {
    // Only show open door when isDoorOpen is explicitly set (after Sofia confirmation)
    if (this.isDoorOpen) {
      this.currentBackgroundUrl = imagePaths.base_door_open;
      return;
    }

    // zoom scenes
    if (this.isLeftBoardZoomed) this.currentBackgroundUrl = imagePaths.leftCorkboardZoomed;
    else if (this.isRightBoardZoomed) this.currentBackgroundUrl = imagePaths.rightCorkboardZoomed;
    else if (this.isCoffeeZoomed) this.currentBackgroundUrl = imagePaths.coffeeZoomed;
    else if (this.isLaptopZoomed) this.currentBackgroundUrl = imagePaths.laptopZoomed;
    else this.currentBackgroundUrl = imagePaths.base;
  }

  // -----------------------------
  // Hotspots (items / scene zoom)
  // -----------------------------
  override onHotspotClick(hotspot: string): void {
    if (this.isIntroPopupVisible || this.activeDialogue) return;

    if (hotspot === 'exitDoor' && (this.isDoorOpen || this.currentState === GameState.AllQuestsComplete_Part3)) {
      this.playSound('success-chime.wav');
      this.currentState = GameState.AllQuestsComplete_Part3;
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
      return;
    }

    if (this.isMainViewActive) {
      // --- Note hunt
      if (this.currentState === GameState.FindNote) {
        if (hotspot === 'leftCorkboard') {
          this.zoomToLocation('leftCorkboard', this.hotspots.mainView, () => {
            this.isLeftBoardZoomed = true;
            this.resetZoom(true);
            this.updateBackground();
          });
          return;
        }
        if (hotspot === 'rightCorkboard') {
          this.zoomToLocation('rightCorkboard', this.hotspots.mainView, () => {
            this.isRightBoardZoomed = true;
            this.resetZoom(true);
            this.updateBackground();
          });
          return;
        }
      }

      // --- USB hunt
      if (this.currentState === GameState.FindUsb && hotspot === 'coffeeMachine') {
        this.zoomToLocation('coffeeMachine', this.hotspots.mainView, () => {
          this.isCoffeeZoomed = true;
          this.resetZoom(true);
          this.updateBackground();
        });
        return;
      }

      // --- Laptop use (training + puzzles)
      if ((this.currentState === GameState.UsbFound_Part2 || this.currentState === GameState.ReadTrainingFile) && hotspot === 'laptop') {
        this.zoomToLocation('laptop', this.hotspots.mainView, () => {
          this.isLaptopZoomed = true;
          this.resetZoom(true);
          this.updateBackground();
        });
        return;
      }

      // optional: clicking laptop too early
      if (hotspot === 'laptop' && this.currentState === GameState.FindUsb) {
        this.showDialogue({ character: '', text: this.t('systemDialogues.laptopTooEarly') });
        return;
      }

      return;
    }

    // zoomed scenes (not main view)
    if (this.isLeftBoardZoomed && hotspot === 'blueNote') {
      this.playSound('paper-rustle.wav');
      this.isBlueNoteVisible = true;
      return;
    }

    if (this.isRightBoardZoomed && hotspot === 'wrongNote') {
      this.showDialogue({ character: '', text: this.t('systemDialogues.wrongCorkboard') });
      return;
    }

    if (this.isCoffeeZoomed && hotspot === 'usb') {
      this.playSound('drawer-search.wav');
      this.isUsbVisible = true;
      return;
    }

    if (this.isLaptopZoomed && hotspot === 'openTraining') {
      if (!this.hasFoundUsb) {
        this.showDialogue({ character: '', text: this.t('systemDialogues.laptopNoUsb') });
        return;
      }
      this.playSound('keyboard_typing.wav');
      this.isTrainingFileVisible = true;
      this.currentState = GameState.ReadTrainingFile;
      return;
    }
  }

  override goBack(): void {
    this.isAnimating = true;
    this.showHints = false;
    this.playSound('step.wav');
    this.isLeftBoardZoomed = false;
    this.isRightBoardZoomed = false;
    this.isCoffeeZoomed = false;
    this.isLaptopZoomed = false;
    this.resetZoom();
    this.updateBackground();
    setTimeout(() => this.isAnimating = false, ESCAPE_ROOM_TIMING.zoomOutDelay);
  }

  // -----------------------------
  // Overlays (note, training file)
  // -----------------------------
  closeBlueNote(): void {
    this.isBlueNoteVisible = false;

    if (!this.hasFoundBlueNote) {
      this.hasFoundBlueNote = true;
      this.playSound('success-chime.wav');

      // move forward
      this.currentState = GameState.NoteFound;
      this.goBack();
      this.showDialogue({ character: '', text: this.t('systemDialogues.noteFoundSuccess') });
    }
  }

  toggleBlueNote(): void {
    if (!this.hasFoundBlueNote) return;
    this.playSound('paper-rustle.wav');
    this.isBlueNoteVisible = !this.isBlueNoteVisible;
    this.isTrainingFileVisible = false;
  }

  closeUsb(): void {
    this.isUsbVisible = false;

    if (!this.hasFoundUsb) {
      this.hasFoundUsb = true;
      this.playSound('success-chime.wav');
      this.goBack();
      this.currentState = GameState.UsbFound;
      this.showDialogue({ character: '', text: this.t('systemDialogues.usbFoundSuccess') });
    }
  }

  toggleUsb(): void {
    if (!this.hasFoundUsb) return;
    this.isUsbVisible = !this.isUsbVisible;
    this.isBlueNoteVisible = false;
    this.isTrainingFileVisible = false;
  }

  closeTrainingFile(): void {
    this.isTrainingFileVisible = false;

    if (!this.hasReadTrainingFile) {
      this.hasReadTrainingFile = true;
      this.playSound('success-chime.wav');
      this.currentState = GameState.ReadTrainingFileDone;
      this.goBack();
      this.showDialogue({ character: '', text: this.t('systemDialogues.trainingFileDone') });
    }
  }

  toggleTrainingFile(): void {
    if (!this.hasReadTrainingFile) return;
    this.playSound('paper-rustle.wav');
    this.isTrainingFileVisible = !this.isTrainingFileVisible;
    this.isBlueNoteVisible = false;
  }

  // -----------------------------
  // Dialogue flow control
  // -----------------------------
  override dismissDialogue(): void {
    if (!this.activeDialogue) return;

    const character = this.activeDialogue.character;
    const state = this.currentState;

    this.activeDialogue = null;
    this.isTyping = false;
    if (this.dialogueInterval) clearInterval(this.dialogueInterval);

    // Handle hint dialogue - keep hints visible for 3 seconds after closing
    if (this.isHintDialogueActive) {
      this.isHintDialogueActive = false;
      this.showHintPulse();
    }

    // reset hover/talking background back to scene
    if (character !== '') {
      this.resetZoom();
      this.updateBackground();
    }

    // system selftalk -> user should click Jake
    if (character === '' && state === GameState.Introduction) {
      // remain in intro; Jake click starts the story
      return;
    }

    // Jake: after greeting -> start FindNote
    if (character === this.t('characters.jake.name') && state === GameState.Introduction) {
      this.currentState = GameState.FindNote;
      this.showDialogue({ character: '', text: this.t('systemDialogues.findNotePrompt') });
      return;
    }

    // System message after setting FindNote -> nothing special
    if (character === '' && state === GameState.FindNote) return;

    // Jake after NoteFound chain
    if (character === this.t('characters.jake.name') && state === GameState.NoteFound) {
      this.currentState = GameState.NoteFound_Part2;
      this.handleJakeDialogue();
      return;
    }
    if (character === this.t('characters.jake.name') && state === GameState.NoteFound_Part2) {
      this.currentState = GameState.NoteFound_Part3;
      this.handleJakeDialogue();
      return;
    }
    if (character === this.t('characters.jake.name') && state === GameState.NoteFound_Part3) {
      this.currentState = GameState.NoteFound_Part4;
      // show Start Quiz button in UI (handled by template)
      this.handleJakeDialogue();
      return;
    }

    // Jake -> Sofia. We deliberately do NOT mention the USB here — that
    // information should come from Sofia herself when the player greets
    // her (MMC Mavis feedback, 2026-05-09).
    if (character === this.t('characters.jake.name') && state === GameState.QuizComplete) {
      this.currentState = GameState.FindUsb;
      this.showDialogue({ character: '', text: this.t('systemDialogues.talkToSofiaPrompt') });
      return;
    }

    // Sofia in FindUsb just explains; stay in FindUsb
    if (character === this.t('characters.sofia.name') && state === GameState.FindUsb) return;

    // after finding usb, user clicks Sofia -> open laptop
    if (character === this.t('characters.sofia.name') && state === GameState.UsbFound) {
      this.currentState = GameState.UsbFound_Part2;
      return;
    }

    // after system "talk to Sofia again" (ReadTrainingFileDone), clicking Sofia starts matching puzzle
    if (character === this.t('characters.sofia.name') && state === GameState.ReadTrainingFileDone) {
      this.currentState = GameState.PuzzleTwo;
      this.quizPositionClass = 'center-right';
      return;
    }

    // after matching completion, clicking Sofia starts sequence puzzle
    if (character === this.t('characters.sofia.name') && state === GameState.PuzzleTwoComplete) {
      this.currentState = GameState.PuzzleThree;
      this.quizPositionClass = 'center';
      return;
    }

    // after sequence, clicking Sofia shows final message and doors open
    if (character === this.t('characters.sofia.name') && state === GameState.AllQuestsComplete) {
      this.currentState = GameState.AllQuestsComplete_Part3;
      this.isDoorOpen = true;
      this.updateBackground();
      // Play door sound after a small delay to ensure it's not cancelled
      setTimeout(() => {
        this.playDoorSound();
      }, ESCAPE_ROOM_TIMING.doorSoundDelay);
      return;
    }

    this.updateBackground();
  }

  // Used by the special "Start Quiz" button in the dialogue panel
  startPuzzleOne(): void {
    this.activeDialogue = null;
    this.currentState = GameState.Quiz;
    this.quizPositionClass = 'center-right';
    this.updateBackground();
  }

  // -----------------------------
  // Puzzle 1: Multiple choice
  // -----------------------------
  submitPuzzleOne(optionKey: string): void {
    if (optionKey === this.puzzle1.correct) {
      this.playSound('success-chime.wav');
      this.currentState = GameState.QuizComplete;
      this.quizFeedback = '';
      this.quiz1WrongAttempts = 0;
      this.recordPuzzleScore('Multiple Choice', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
      this.isQuizCompleteOverlayVisible = true;
    } else {
      this.playSound('error-buzz.mp3');
      this.isQuizWrong = true;
      this.quiz1WrongAttempts++;
      this.puzzle1TotalWrong++;

      if (this.quiz1WrongAttempts >= 3) {
        this.puzzle1WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.puzzleOne.answerOverlay');
        this.answerOverlayCallback = () => {
          this.quiz1WrongAttempts = 0;
          this.quizFeedback = '';
          this.currentState = GameState.QuizComplete;
          this.recordPuzzleScore('Multiple Choice', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
          this.isQuizCompleteOverlayVisible = true;
        };
        this.showAnswerOverlay = true;
      } else {
        this.quizFeedback = this.puzzle1.hint;
      }

      setTimeout(() => (this.isQuizWrong = false), ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  closeQuizCompleteOverlay(): void {
    this.isQuizCompleteOverlayVisible = false;
    this.showDialogue({ character: '', text: this.t('systemDialogues.quizCompletePrompt') });
  }

  // -----------------------------
  // Puzzle 2: Matching
  // -----------------------------
  submitMatching(): void {
    const allPicked = this.matchingRows.every((r) => !!this.matchingSelection[r.id]);
    if (!allPicked) {
      this.matchingFeedback = this.t('puzzles.matching.feedback.notAllPicked');
      this.playSound('error-buzz.mp3');
      this.isQuizWrong = true;
      setTimeout(() => (this.isQuizWrong = false), ESCAPE_ROOM_TIMING.shakeTimeout);
      return;
    }

    const allCorrect = this.matchingRows.every((r) => this.matchingSelection[r.id] === this.matchingAnswerKey[r.id]);
    if (allCorrect) {
      this.playSound('success-chime.wav');
      this.matchingFeedback = '';
      this.matchingWrongAttempts = 0;
      this.recordPuzzleScore('Matching', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
      this.currentState = GameState.PuzzleTwoComplete;
      this.isMatchingCompleteOverlayVisible = true;
    } else {
      this.playSound('error-buzz.mp3');
      this.isQuizWrong = true;
      this.matchingWrongAttempts++;
      this.puzzle2TotalWrong++;

      if (this.matchingWrongAttempts >= 3) {
        this.puzzle2WasRevealed = true;
        // Auto-fill the correct answers
        this.matchingSelection = { '1': 'D', '2': 'B', '3': 'A', '4': 'C' };
        this.answerOverlayText = this.t('puzzles.matching.answerOverlay');
        this.answerOverlayCallback = () => {
          this.matchingWrongAttempts = 0;
          this.matchingFeedback = '';
          this.recordPuzzleScore('Matching', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
          this.currentState = GameState.PuzzleTwoComplete;
          this.isMatchingCompleteOverlayVisible = true;
        };
        this.showAnswerOverlay = true;
      } else {
        this.matchingFeedback = this.t('puzzles.matching.feedback.wrong');
      }

      setTimeout(() => (this.isQuizWrong = false), ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  closeMatchingCompleteOverlay(): void {
    this.isMatchingCompleteOverlayVisible = false;
    this.showDialogue({ character: '', text: this.t('systemDialogues.matchingCompletePrompt') });
  }

  // -----------------------------
  // Puzzle 3: Sequence ordering
  // -----------------------------
  addToSequence(key: string): void {
    if (!this.puzzleThreeSequence.includes(key)) this.puzzleThreeSequence.push(key);
  }

  resetSequence(): void {
    this.puzzleThreeSequence = [];
    this.puzzleThreeFeedback = '';
    this.sequenceWrongAttempts = 0;
  }

  submitSequence(): void {
    if (this.puzzleThreeSequence.length < 4) return;

    const correct = this.puzzleThreeSequence.join(',') === this.puzzleThreeCorrectSequence.join(',');
    if (correct) {
      this.playSound('success-chime.wav');
      this.currentState = GameState.AllQuestsComplete;
      this.puzzleThreeFeedback = '';
      this.recordPuzzleScore('Sequence', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
      this.showDialogue({ character: '', text: this.t('systemDialogues.sequenceCompletePrompt') });
      return;
    }

    this.playSound('error-buzz.mp3');
    this.isQuizWrong = true;
    this.sequenceWrongAttempts++;
    this.puzzle3TotalWrong++;

    // progressive hints from the scenario
    if (this.sequenceWrongAttempts >= 3) {
      this.puzzle3WasRevealed = true;
      this.puzzleThreeSequence = [...this.puzzleThreeCorrectSequence];
      this.answerOverlayText = this.t('puzzles.sequence.answerOverlay');
      this.answerOverlayCallback = () => {
        this.sequenceWrongAttempts = 0;
        this.recordPuzzleScore('Sequence', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
        this.currentState = GameState.AllQuestsComplete;
        this.showDialogue({ character: '', text: this.t('systemDialogues.sequenceCompletePromptAfterReveal') });
      };
      this.showAnswerOverlay = true;
    } else if (this.sequenceWrongAttempts === 1) {
      this.puzzleThreeFeedback = this.t('puzzles.sequence.hints.attempt1');
    } else if (this.sequenceWrongAttempts === 2) {
      this.puzzleThreeFeedback = this.t('puzzles.sequence.hints.attempt2');
    }

    setTimeout(() => (this.isQuizWrong = false), 1000);
  }

  // -----------------------------
  // Hint button
  // -----------------------------
  override requestHint(): void {
    if (this.hintCooldown || this.activeDialogue || this.isIntroPopupVisible) return;

    this.playSound('hint.wav');
    this.showHints = true;
    this.showHintPulse();
    this.hintCooldown = true;
    this.isHintDialogueActive = true;

    if (this.currentState === GameState.FindNote) {
      this.showDialogue({ character: '', text: this.t('hints.findNote') });
    } else if (this.currentState === GameState.FindUsb) {
      this.showDialogue({ character: '', text: this.t('hints.findUsb') });
    } else if (this.currentState === GameState.PuzzleThree) {
      this.showDialogue({ character: '', text: this.t('hints.puzzleThree') });
    } else {
      this.showDialogue({ character: '', text: this.t('hints.default') });
    }

    setTimeout(() => (this.hintCooldown = false), 2500);
  }

  // -----------------------------
  // Answer Overlay (override to also clear puzzleThreeFeedback)
  // -----------------------------
  override closeAnswerOverlay(): void {
    this.showAnswerOverlay = false;
    this.puzzleThreeFeedback = '';
    if (this.answerOverlayCallback) {
      this.answerOverlayCallback();
      this.answerOverlayCallback = null;
    }
  }

  // -----------------------------
  // End overlay
  // -----------------------------
  closeGameCompleteOverlay(): void {
    this.isGameCompleteOverlayVisible = false;
  }

  // --- Skip Puzzle Methods ---
  skipPuzzle1(): void {
    this.recordPuzzleScore('Multiple Choice', 99, true);
    this.currentState = GameState.QuizComplete;
    this.quizFeedback = '';
    this.isQuizWrong = false;
    this.isQuizCompleteOverlayVisible = true;
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Matching', 99, true);
    this.currentState = GameState.PuzzleTwoComplete;
    this.matchingFeedback = '';
    this.isQuizWrong = false;
    this.isMatchingCompleteOverlayVisible = true;
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Sequence', 99, true);
    this.currentState = GameState.AllQuestsComplete;
    this.puzzleThreeFeedback = '';
    this.isQuizWrong = false;
    this.puzzleThreeSequence = [];
    this.showDialogue({ character: '', text: this.t('systemDialogues.sequenceCompletePrompt') });
  }
}

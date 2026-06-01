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
  Introduction,
  Introduction_Part2,
  FindNote,
  NoteFound,
  NoteFound_Part2,
  NoteFound_Part3,
  NoteFound_Part4,
  Quiz,
  QuizComplete,
  QuizComplete_Part2,
  FindPaper,
  PaperFound,
  PaperFound_Part2,
  PuzzleTwo,
  PuzzleThree,
  AllQuestsComplete,
  AllQuestsComplete_Part2,
  AllQuestsComplete_Part3
}

interface QuizQuestion { type: string; text: string; answer: boolean; hint: string; }

const imagePaths = {
  base: '/assets/images/escape_room_raw_empty_final_people_zoomed_good_2.png',
  hrHover: '/assets/images/right_person_look.png',
  colleagueHover: '/assets/images/left_person_look.png',
  hrHover_door_open: '/assets/images/right_person_look_open_door.png',
  colleagueHover_door_open: '/assets/images/left_person_look_open_door.png',
  rightBoardZoomed: '/assets/images/right_board.png',
  leftBoardZoomed: '/assets/images/left_board.png',
  hrTalking: '/assets/images/right_person_talking.png',
  colleagueTalking: '/assets/images/left_person_talking.png',
  hrQuiz: '/assets/images/right_person_talking_simple.png',
  drawers: '/assets/images/drawers.png',
  drawers_opened: '/assets/images/drawers_opened.png',
  folders: '/assets/images/folders.png',
  folders_opened: '/assets/images/folders_opened.png',
  note: '/assets/images/note.png',
  base_door_open: '/assets/images/base_door_open.png',
  colleague_thumbs_up: '/assets/images/colleague_thumbs_up.png',
  paper: '/assets/images/paper.jpg',
  puzzleTwoBackground: '/assets/images/right_person_talking_simple.png',
  puzzleThreeBackground: '/assets/images/right_person_talking_simple.png',
};

const roomConfig: EscapeRoomConfig = {
  roomId: 'cultural-awareness',
  typewriterSpeed: 30,
  defaultZoomLevel: 3.0,
  characterZoomLevel: 1.5,
  preloadDoorSound: false,
};

@Component({
  selector: 'app-escape-room',
  templateUrl: './escape-room.component.html',
  styleUrls: ['./escape-room.component.scss'],
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
  animations: [fadeInOut]
})
export class EscapeRoomComponent extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  override get config(): EscapeRoomConfig { return roomConfig; }

  hotspots = {
    mainView: {
      hrManager: { x: 75, y: 30, width: 10, height: 40 },
      colleague: { x: 25, y: 45, width: 15, height: 40 },
      drawer: { x: 60, y: 60, width: 15, height: 18 },
      desk_dossiers: { x: 0, y: 58, width: 14, height: 16 },
      desk_drawers: { x: 58, y: 50, width: 16, height: 18 },
      rightBoard: { x: 55, y: 35, width: 13, height: 15 },
      leftBoard: { x: 33, y: 35, width: 13, height: 15 },
      laptop: { x: 14, y: 58, width: 10, height: 10 },
      exitDoor: { x: 46, y: 30, width: 10, height: 35 },
    },
    rightBoardView: { noteOnBoard: { x: 45, y: 63, width: 4, height: 8 } },
    leftBoardView: { message: { x: 12, y: 27, width: 38, height: 44 } },
    drawersView: { open: { x: 76, y: 42, width: 17, height: 16 } },
    desk_dossiers_View: { open: { x: 5, y: 50, width: 30, height: 44 } },
    desk_drawers_View: { open: { x: 40, y: 20, width: 50, height: 20 } },
  };

  get puzzleThreeOptions(): { [key: string]: string } {
    return {
      'a': this.t('puzzles.puzzleThree.options.a'),
      'b': this.t('puzzles.puzzleThree.options.b'),
      'c': this.t('puzzles.puzzleThree.options.c'),
      'd': this.t('puzzles.puzzleThree.options.d')
    };
  }
  puzzleThreeSequence: string[] = [];
  puzzleThreeFeedback: string = '';
  sequenceWrongAttempts: number = 0;

  puzzleTwoWrongAttempts: number = 0;
  quizWrongAttempts: number = 0;

  // Cumulative wrong attempt counters for scoring (never reset)
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  currentState: GameState = GameState.Introduction;
  isRightBoardZoomed: boolean = false;
  isLeftBoardZoomed: boolean = false;
  isDrawersZoomed: boolean = false;
  isDrawerOpened: boolean = false;
  isDeskDossiersZoomed: boolean = false;
  isDeskDossiersOpened: boolean = false;
  isDeskDrawersZoomed: boolean = false;
  isDeskDrawersOpened: boolean = false;

  isNoteVisible: boolean = false;
  isPaperVisible: boolean = false;
  isQuizWrong: boolean = false;
  isQuizCompleteOverlayVisible: boolean = false;

  quizFeedback: string = '';
  quizPositionClass: string = 'center';

  hasFoundNote: boolean = false;
  hasFoundPaper: boolean = false;
  hasLaptopHint: boolean = false;

  questStep: number = 0;

  // trackBy functions to prevent DOM recreation from getter-backed *ngFor data
  trackByKey = (_: number, item: { key: string }): string => item.key;
  trackByIndex = (index: number): number => index;

  quizTitle: string = '';
  quizQuestions: QuizQuestion[] = [];
  currentQuizQuestionIndex: number = 0;

  override get characterImages(): CharacterImageMap {
    return {
      hrManager: { hover: imagePaths.hrHover, hoverDoorOpen: imagePaths.hrHover_door_open },
      colleague: { hover: imagePaths.colleagueHover, hoverDoorOpen: imagePaths.colleagueHover_door_open },
    };
  }

  public override get isMainViewActive(): boolean {
    return !this.isRightBoardZoomed && !this.isLeftBoardZoomed && !this.isDrawersZoomed && !this.isDeskDossiersZoomed && !this.isDeskDrawersZoomed;
  }

  public override get isQuizActive(): boolean {
    return this.currentState === GameState.Quiz ||
      this.currentState === GameState.PuzzleTwo ||
      this.currentState === GameState.PuzzleThree;
  }

  public get currentQuestion(): QuizQuestion | null {
    if (this.quizQuestions.length > this.currentQuizQuestionIndex) {
      return this.quizQuestions[this.currentQuizQuestionIndex];
    }
    return null;
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
        this.currentState === GameState.AllQuestsComplete_Part3) {
      this.currentBackgroundUrl = imagePaths.base_door_open;
      return;
    }

    if (this.currentState === GameState.Quiz || this.currentState === GameState.PuzzleTwo || this.currentState === GameState.PuzzleThree) {
      this.currentBackgroundUrl = imagePaths.hrQuiz;
    }
    else if (this.isRightBoardZoomed) { this.currentBackgroundUrl = imagePaths.rightBoardZoomed; }
    else if (this.isLeftBoardZoomed) { this.currentBackgroundUrl = imagePaths.leftBoardZoomed; }
    else if (this.isDrawersZoomed) {
      this.currentBackgroundUrl = this.isDrawerOpened ? imagePaths.drawers_opened : imagePaths.drawers;
    }
    else if (this.isDeskDossiersZoomed) {
      this.currentBackgroundUrl = this.isDeskDossiersOpened ? imagePaths.folders_opened : imagePaths.folders;
    }
    else if (this.isDeskDrawersZoomed) {
      this.currentBackgroundUrl = this.isDeskDrawersOpened ? imagePaths.drawers_opened : imagePaths.drawers;
    }
    else if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; }
    else { this.currentBackgroundUrl = imagePaths.base; }
  }

  // --- Character interactions ---
  onCharacterClick(character: 'hrManager' | 'colleague'): void {
    this.playSound('character-click.wav');
    let dialogueText = '';
    let dialogueCharacter = '';

    if (character === 'colleague') {
      dialogueCharacter = this.t('characters.jun.name');
      this.currentBackgroundUrl = imagePaths.colleagueTalking;

      if (this.currentState === GameState.FindPaper) {
        if (this.questStep < 1) {
          dialogueText = this.t('characters.jun.dialogues.findPaper_noProgress');
        } else {
          if (!this.hasLaptopHint) {
            dialogueText = this.t('characters.jun.dialogues.findPaper_laptopHint');
            this.hasLaptopHint = true;
          } else {
            dialogueText = this.t('characters.jun.dialogues.findPaper_laptopReminder');
          }
        }
      }
      else if (this.currentState === GameState.AllQuestsComplete || this.currentState === GameState.AllQuestsComplete_Part2 || this.currentState === GameState.AllQuestsComplete_Part3) {
        this.currentBackgroundUrl = imagePaths.colleague_thumbs_up;
        dialogueText = this.t('characters.jun.dialogues.allQuestsComplete');
      }
      else {
        dialogueText = this.t('characters.jun.dialogues.default');
      }
      this.showDialogue({ character: dialogueCharacter, text: dialogueText });
    }

    if (character === 'hrManager') {
      dialogueCharacter = this.t('characters.fatma.name');
      this.currentBackgroundUrl = imagePaths.hrTalking;
      switch (this.currentState) {
        case GameState.Introduction:
          dialogueText = this.t('characters.fatma.dialogues.introduction');
          break;
        case GameState.FindNote:
          dialogueText = this.t('characters.fatma.dialogues.findNote');
          break;
        case GameState.NoteFound:
          dialogueText = this.t('characters.fatma.dialogues.noteFound');
          break;
        case GameState.QuizComplete:
          dialogueText = this.t('characters.fatma.dialogues.quizComplete');
          break;
        case GameState.FindPaper:
          dialogueText = this.t('characters.fatma.dialogues.findPaper');
          break;
        case GameState.PaperFound:
          dialogueText = this.t('characters.fatma.dialogues.paperFound');
          break;
        case GameState.PuzzleTwo:
        case GameState.PuzzleThree:
          dialogueText = this.t('characters.fatma.dialogues.puzzleInProgress');
          break;
        case GameState.AllQuestsComplete:
        case GameState.AllQuestsComplete_Part2:
        case GameState.AllQuestsComplete_Part3:
          dialogueText = this.t('characters.fatma.dialogues.allQuestsComplete');
          break;
      }
      this.showDialogue({ character: dialogueCharacter, text: dialogueText });
    }
  }

  // --- Hotspot clicks ---
  override onHotspotClick(hotspot: string): void {
    this.dismissDialogue();

    if (hotspot === 'exitDoor' && (this.currentState === GameState.AllQuestsComplete_Part3 || this.isDoorOpen)) {
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
      return;
    }

    if (this.isMainViewActive) {
      if (hotspot === 'laptop' && this.currentState === GameState.FindPaper) {
        if (this.hasLaptopHint) {
          this.playSound('success-chime.wav');
          this.playSound('paper-rustle.wav');
          this.isPaperVisible = true;
        } else {
          this.showDialogue({ character: '', text: this.t('systemDialogues.askJunFirst') });
        }
        return;
      }

      this.zoomToLocation(hotspot, this.hotspots.mainView, () => {
        if (this.currentState === GameState.FindNote) {
          if (hotspot === 'rightBoard') this.isRightBoardZoomed = true;
          else if (hotspot === 'leftBoard') this.isLeftBoardZoomed = true;
          else if (hotspot === 'drawer') this.isDrawersZoomed = true;
          else if (hotspot === 'desk_dossiers') this.isDeskDossiersZoomed = true;
        }
        else if (this.currentState === GameState.FindPaper) {
          if (hotspot === 'desk_drawers') this.isDeskDrawersZoomed = true;
          else if (hotspot === 'leftBoard') this.isLeftBoardZoomed = true;
          else if (hotspot === 'rightBoard') this.isRightBoardZoomed = true;
        }

        this.updateBackground();
        this.resetZoom(true);
      });
      return;
    }

    if (this.currentState === GameState.FindNote) {
      if (hotspot === 'note') {
        this.playSound('success-chime.wav');
        this.playSound('paper-rustle.wav');
        this.isNoteVisible = true;
      } else if (hotspot === 'zoomedDrawerClick') {
        this.playSound('drawer-search.wav');
        this.isDrawerOpened = true;
        this.updateBackground();

        if (this.questStep < 1) this.questStep = 1;

        this.showDialogue({ character: '', text: this.t('systemDialogues.drawerSearch') });
      } else if (hotspot === 'zoomedDeskDossiersClick') {
        this.playSound('folder-search.wav');
        this.isDeskDossiersOpened = true;
        this.updateBackground();
        this.showDialogue({ character: '', text: this.t('systemDialogues.deskDossiersSearch') });
      } else if (hotspot === 'zoomedLeftBoardMessage') {
        if (this.questStep < 2) this.questStep = 2;

        this.showDialogue({ character: '', text: this.t('systemDialogues.leftBoardMessage') });
      }
    }
    else if (this.currentState === GameState.FindPaper) {
      if (hotspot === 'zoomedDeskDrawersClick') {
        this.playSound('folder-search.wav');

        if (this.questStep < 1) this.questStep = 1;

        this.showDialogue({ character: '', text: this.t('systemDialogues.deskDrawersSearch') });
      }
      else {
        this.showDialogue({ character: '', text: this.t('systemDialogues.alreadySearched') });
      }
    }
  }

  // --- Hint ---
  protected override getHintText(): string {
    if (this.currentState === GameState.FindNote) {
      if (this.questStep === 0) return this.t('hints.findNote.step0');
      else if (this.questStep === 1) return this.t('hints.findNote.step1');
      else return this.t('hints.findNote.step2');
    } else if (this.currentState === GameState.FindPaper) {
      if (this.questStep === 0) return this.t('hints.findPaper.step0');
      else return this.t('hints.findPaper.step1');
    } else if (this.currentState === GameState.AllQuestsComplete ||
               this.currentState === GameState.AllQuestsComplete_Part2 ||
               this.currentState === GameState.AllQuestsComplete_Part3) {
      return this.t('hints.allQuestsComplete');
    }
    return this.t('hints.default');
  }

  continueIntroduction(): void {
    if (this.currentState === GameState.Introduction) {
      this.currentState = GameState.Introduction_Part2;
      this.showDialogue({ character: this.t('characters.fatma.name'), text: this.t('characters.fatma.dialogues.introduction_part2') });
    }
  }

  startQuest(): void {
    this.currentState = GameState.FindNote;
    this.questStep = 0;
    // Revert the HR "talking" close-up to the base scene now the intro chat is over.
    this.updateBackground();
    this.dismissDialogue();
  }

  startQuiz(): void {
    this.activeDialogue = null;
    this.quizTitle = this.t('puzzles.quiz.title');
    const questionsData = this.texts?.['puzzles']?.['quiz']?.['questions'];
    this.quizQuestions = [
      {
        type: 'tf',
        text: questionsData?.[0]?.text || '',
        answer: true,
        hint: questionsData?.[0]?.hint || ''
      },
      {
        type: 'tf',
        text: questionsData?.[1]?.text || '',
        answer: false,
        hint: questionsData?.[1]?.hint || ''
      },
      {
        type: 'tf',
        text: questionsData?.[2]?.text || '',
        answer: false,
        hint: questionsData?.[2]?.hint || ''
      }
    ];
    this.currentQuizQuestionIndex = 0;
    this.quizFeedback = '';
    this.currentState = GameState.Quiz;
    this.updateBackground();
    this.quizPositionClass = 'left-center';
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

    const fatmaName = this.t('characters.fatma.name');

    if (character === fatmaName && state === GameState.Introduction) {
      this.continueIntroduction();
      return;
    }
    if (character === fatmaName && state === GameState.Introduction_Part2) {
      this.startQuest();
      return;
    }

    if (character === fatmaName && state === GameState.NoteFound) {
      this.currentState = GameState.NoteFound_Part2;
      this.showDialogue({ character: fatmaName, text: this.t('characters.fatma.dialogues.noteFound_part2') });
      return;
    }
    if (character === fatmaName && state === GameState.NoteFound_Part2) {
      this.currentState = GameState.NoteFound_Part3;
      this.showDialogue({ character: fatmaName, text: this.t('characters.fatma.dialogues.noteFound_part3') });
      return;
    }
    if (character === fatmaName && state === GameState.NoteFound_Part3) {
      this.currentState = GameState.NoteFound_Part4;
      this.showDialogue({ character: fatmaName, text: this.t('characters.fatma.dialogues.noteFound_part4') });
      return;
    }

    if (character === fatmaName && state === GameState.NoteFound_Part4) {
      this.startQuiz();
      return;
    }

    if (character === fatmaName && state === GameState.QuizComplete) {
      this.currentState = GameState.QuizComplete_Part2;
      this.showDialogue({
        character: fatmaName,
        text: this.t('characters.fatma.dialogues.quizComplete_part2')
      });
      return;
    }
    if (character === fatmaName && state === GameState.QuizComplete_Part2) {
      this.currentState = GameState.FindPaper;
      this.questStep = 0;
      this.updateBackground();
      return;
    }

    if (character === fatmaName && state === GameState.PaperFound) {
      this.currentState = GameState.PaperFound_Part2;
      this.showDialogue({ character: fatmaName, text: this.t('characters.fatma.dialogues.paperFound_part2') });
      return;
    }
    if (character === fatmaName && state === GameState.PaperFound_Part2) {
      this.currentState = GameState.PuzzleTwo;
      this.quizPositionClass = 'center-right';
      this.updateBackground();
      return;
    }

    if (character === fatmaName && state === GameState.AllQuestsComplete) {
      this.currentState = GameState.AllQuestsComplete_Part2;
      this.showDialogue({ character: fatmaName, text: this.t('characters.fatma.dialogues.allQuestsComplete_part2') });
      return;
    }
    if (character === fatmaName && state === GameState.AllQuestsComplete_Part2) {
      this.currentState = GameState.AllQuestsComplete_Part3;
      this.showDialogue({ character: fatmaName, text: this.t('characters.fatma.dialogues.allQuestsComplete_part3') });
      return;
    }

    if (character === fatmaName && state === GameState.AllQuestsComplete_Part3 && !this.isDoorOpen) {
      this.isDoorOpen = true;
      this.playDoorSound();
      this.updateBackground();
    }

    this.updateBackground();
  }

  protected override resetZoomState(): void {
    this.isDrawersZoomed = false;
    this.isDeskDossiersZoomed = false;
    this.isDeskDrawersZoomed = false;
    this.isRightBoardZoomed = false;
    this.isLeftBoardZoomed = false;
    this.isDrawerOpened = false;
    this.isDeskDossiersOpened = false;
    this.isDeskDrawersOpened = false;
  }

  submitQuiz(answer: boolean): void {
    this.quizFeedback = '';
    this.isQuizWrong = false;
    const currentQuestion = this.currentQuestion;
    if (!currentQuestion) return;

    if (answer === currentQuestion.answer) {
      this.playSound('success-chime.wav');
      this.quizWrongAttempts = 0;
      this.currentQuizQuestionIndex++;
      if (this.currentQuizQuestionIndex >= this.quizQuestions.length) {
        this.currentState = GameState.QuizComplete;
        this.isQuizCompleteOverlayVisible = true;
        this.recordPuzzleScore('Quiz', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
      } else {
        this.quizFeedback = '';
      }
    } else {
      this.playSound('error-buzz.mp3');
      this.isQuizWrong = true;
      this.quizWrongAttempts++;
      this.puzzle1TotalWrong++;

      if (this.quizWrongAttempts >= 3) {
        this.puzzle1WasRevealed = true;
        const correctAnswer = currentQuestion.answer
          ? this.t('puzzles.quiz.answerOverlay.trueValue')
          : this.t('puzzles.quiz.answerOverlay.falseValue');
        this.answerOverlayText = `${this.t('puzzles.quiz.answerOverlay.prefix')}\n\n${this.t('puzzles.quiz.answerOverlay.questionLabel')} "${currentQuestion.text}"\n\n${this.t('puzzles.quiz.answerOverlay.correctAnswerLabel')} ${correctAnswer}\n\n${this.t('puzzles.quiz.answerOverlay.explanationLabel')} ${currentQuestion.hint}`;
        this.answerOverlayCallback = () => {
          this.quizWrongAttempts = 0;
          this.currentQuizQuestionIndex++;
          if (this.currentQuizQuestionIndex >= this.quizQuestions.length) {
            this.currentState = GameState.QuizComplete;
            this.isQuizCompleteOverlayVisible = true;
            this.recordPuzzleScore('Quiz', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
          }
        };
        this.showAnswerOverlay = true;
      } else {
        this.quizFeedback = currentQuestion.hint;
      }
      setTimeout(() => this.isQuizWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  closeQuizCompleteOverlay(): void {
    this.isQuizCompleteOverlayVisible = false;
    this.currentState = GameState.QuizComplete;
    this.showDialogue({ character: '', text: this.t('systemDialogues.quizCompleteReturn') });
  }

  submitPuzzleTwo(answer: 'a' | 'b' | 'c' | 'd'): void {
    this.quizFeedback = '';
    this.isQuizWrong = false;
    if (answer === 'b') {
      this.playSound('success-chime.wav');
      this.puzzleTwoWrongAttempts = 0;
      this.currentState = GameState.PuzzleThree;
      this.quizPositionClass = 'bottom-left';
      this.quizFeedback = '';
      this.recordPuzzleScore('Multiple Choice', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
    } else {
      this.playSound('error-buzz.mp3');
      this.isQuizWrong = true;
      this.puzzleTwoWrongAttempts++;
      this.puzzle2TotalWrong++;

      if (this.puzzleTwoWrongAttempts >= 3) {
        this.puzzle2WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.puzzleTwo.answerOverlay');
        this.answerOverlayCallback = () => {
          this.puzzleTwoWrongAttempts = 0;
          this.currentState = GameState.PuzzleThree;
          this.quizPositionClass = 'bottom-left';
          this.recordPuzzleScore('Multiple Choice', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
        };
        this.showAnswerOverlay = true;
      } else {
        this.quizFeedback = this.t('puzzles.puzzleTwo.feedback');
      }
      setTimeout(() => this.isQuizWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  addToSequence(optionKey: string): void {
    this.puzzleThreeSequence = this.addToSequenceArray(this.puzzleThreeSequence, optionKey, 4);
  }

  resetSequence(): void {
    this.puzzleThreeSequence = [];
    this.puzzleThreeFeedback = '';
    this.resetSequenceArray();
  }

  submitSequence(): void {
    const correctSequence = ['c', 'b', 'a', 'd'];
    this.puzzleThreeFeedback = '';
    this.isQuizWrong = false;

    if (JSON.stringify(this.puzzleThreeSequence) === JSON.stringify(correctSequence)) {
      this.playSound('success-chime.wav');
      this.currentState = GameState.AllQuestsComplete;
      this.recordPuzzleScore('Sequence', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
      this.showDialogue({ character: this.t('characters.fatma.name'), text: this.t('characters.fatma.dialogues.allQuestsComplete') });
    } else {
      this.playSound('error-buzz.mp3');
      this.isQuizWrong = true;
      this.sequenceWrongAttempts++;
      this.puzzle3TotalWrong++;

      if (this.sequenceWrongAttempts >= 3) {
        this.puzzle3WasRevealed = true;
        this.puzzleThreeFeedback = this.t('puzzles.puzzleThree.feedback.threeAttempts');
        this.puzzleThreeSequence = ['c', 'b', 'a', 'd'];
      } else if (this.puzzleThreeSequence.length > 0 && this.puzzleThreeSequence[0] !== correctSequence[0]) {
        this.puzzleThreeFeedback = this.t('puzzles.puzzleThree.feedback.position1');
      }
      else if (this.puzzleThreeSequence.length > 1 && this.puzzleThreeSequence[1] !== correctSequence[1]) {
        this.puzzleThreeFeedback = this.t('puzzles.puzzleThree.feedback.position2');
      }
      else if (this.puzzleThreeSequence.length > 2 && this.puzzleThreeSequence[2] !== correctSequence[2]) {
        this.puzzleThreeFeedback = this.t('puzzles.puzzleThree.feedback.position3');
      }
      else if (this.puzzleThreeSequence.length > 3 && this.puzzleThreeSequence[3] !== correctSequence[3]) {
        this.puzzleThreeFeedback = this.t('puzzles.puzzleThree.feedback.position4');
      } else {
        this.puzzleThreeFeedback = this.t('puzzles.puzzleThree.feedback.incomplete');
      }

      setTimeout(() => this.isQuizWrong = false, ESCAPE_ROOM_TIMING.sequenceShakeTimeout);
    }
  }

  closeNote(): void {
    this.isNoteVisible = false;
    if (!this.hasFoundNote) {
      this.hasFoundNote = true;
      this.currentState = GameState.NoteFound;
      this.goBack();
      this.showDialogue({ character: '', text: this.t('items.note.foundDialogue') });
    }
  }

  closePaper(): void {
    this.isPaperVisible = false;
    if (!this.hasFoundPaper) {
      this.hasFoundPaper = true;
      this.currentState = GameState.PaperFound;
      this.resetZoom(true);
      this.updateBackground();
      setTimeout(() => {
        this.showDialogue({ character: '', text: this.t('items.paper.foundDialogue') });
      }, 800);
    }
  }

  toggleNote(): void {
    if (this.hasFoundNote) {
      this.playSound('paper-rustle.wav');
      this.isNoteVisible = !this.isNoteVisible;
      this.isPaperVisible = false;
    }
  }

  togglePaper(): void {
    if (this.hasFoundPaper) {
      this.playSound('paper-rustle.wav');
      this.isPaperVisible = !this.isPaperVisible;
      this.isNoteVisible = false;
    }
  }

  // --- Skip Puzzle Methods ---
  skipPuzzle1(): void {
    this.recordPuzzleScore('Quiz', 99, true);
    this.currentState = GameState.QuizComplete;
    this.quizFeedback = '';
    this.isQuizWrong = false;
    this.isQuizCompleteOverlayVisible = true;
    this.updateBackground();
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Multiple Choice', 99, true);
    this.currentState = GameState.PuzzleThree;
    this.quizFeedback = '';
    this.isQuizWrong = false;
    this.quizPositionClass = 'bottom-left';
    this.updateBackground();
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Sequence', 99, true);
    this.currentState = GameState.AllQuestsComplete;
    this.puzzleThreeFeedback = '';
    this.isQuizWrong = false;
    this.puzzleThreeSequence = [];
    this.showDialogue({ character: this.t('characters.fatma.name'), text: this.t('characters.fatma.dialogues.allQuestsComplete') });
    this.updateBackground();
  }
}

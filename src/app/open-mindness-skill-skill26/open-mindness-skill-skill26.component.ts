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

// --- Interfaces and Enums ---
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

// --- Asset Paths ---
const imagePaths = {
  base: '/assets/images/open_mindedness/cafeteria_base.png',
  karinaHover: '/assets/images/open_mindedness/karina_look.png',
  danielHover: '/assets/images/open_mindedness/daniel_look.png',
  karinaTalking: '/assets/images/open_mindedness/karina_talking.png',
  danielTalking: '/assets/images/open_mindedness/daniel_talking.png',
  danielQuiz: '/assets/images/open_mindedness/daniel_quiz.png',
  coffeeMachineZoomed: '/assets/images/open_mindedness/coffee_machine_zoomed.png',
  leftNoticeboard: '/assets/images/open_mindedness/left_noticeboard.png',
  coffeeTableZoomed: '/assets/images/open_mindedness/coffee_table_zoomed.png',
  deskZoomed: '/assets/images/open_mindedness/coffee_table_zoomed.png',
  strategiesTableZoomed: '/assets/images/open_mindedness/desk_zoomed.png',
  note: '/assets/images/open_mindedness/sticky_note.png',
  paper: '/assets/images/open_mindedness/paper.png',
  base_door_open: '/assets/images/open_mindedness/cafeteria_door_open.png',
  karinaHoverOpenDoor: '/assets/images/open_mindedness/karina_look_open_door.png',
  danielHoverOpenDoor: '/assets/images/open_mindedness/daniel_look_open_door.png',
};

const roomConfig: EscapeRoomConfig = {
  roomId: 'open-mindedness',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: true,
};

@Component({
  selector: 'app-open-mindness-skill-skill26',
  templateUrl: './open-mindness-skill-skill26.component.html',
  styleUrl: './open-mindness-skill-skill26.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
  animations: [fadeInOut]
})
export class OpenMindnessSkillSkill26Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  override get config(): EscapeRoomConfig { return roomConfig; }

  hotspots = {
    mainView: {
      karina: { x: 18, y: 35, width: 20, height: 40 },
      daniel: { x: 70, y: 35, width: 20, height: 40 },
      coffeeMachine: { x: 90, y: 35, width: 10, height: 18 },
      leftNoticeboard: { x: 65, y: 10, width: 27, height: 25 },
      backCoffeeTable: { x: 45, y: 45, width: 20, height: 20 },
      desk: { x: 45, y: 45, width: 20, height: 20  },
      strategiesTable: { x: 20, y: 70, width: 50, height: 25 },
      exitDoor: { x: 46, y: 10, width: 12, height: 55 },
    },
    coffeeMachineView: {
      coffeeArea: { x: 40, y: 50, width: 20, height: 30 }
    },
    leftNoticeboardView: {
      stickyNotes: { x: 20, y: 35, width: 60, height: 50 }
    },
    coffeeTableView: {
      plantWithNote: { x: 42, y: 20, width: 10, height: 15}
    },
    deskView: {
      deskArea: { x: 30, y: 40, width: 40, height: 35 }
    },
    strategiesTableView: {
      notebook: { x: 55, y: 55, width: 25, height: 20 }
    },
  };

  trackByKey = (_: number, item: { key: string }) => item.key;
  trackByIndex = (index: number) => index;

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
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  puzzleTwoWrongAttempts: number = 0;
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;
  quizWrongAttempts: number = 0;
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;

  currentState: GameState = GameState.Introduction;
  isCoffeeMachineZoomed: boolean = false;
  isLeftNoticeboardZoomed: boolean = false;
  isCoffeeTableZoomed: boolean = false;
  isDeskZoomed: boolean = false;
  isStrategiesTableZoomed: boolean = false;

  isNoteVisible: boolean = false;
  isPaperVisible: boolean = false;
  isQuizWrong: boolean = false;
  private isHintDialogueActive: boolean = false;
  isQuizCompleteOverlayVisible: boolean = false;

  quizFeedback: string = '';
  quizPositionClass: string = 'center';

  hasFoundNote: boolean = false;
  hasFoundPaper: boolean = false;
  hasDeskHint: boolean = false;

  questStep: number = 0;

  quizTitle: string = '';
  quizQuestions: QuizQuestion[] = [];
  currentQuizQuestionIndex: number = 0;

  override get characterImages(): CharacterImageMap {
    return {
      karina: { hover: imagePaths.karinaHover, hoverDoorOpen: imagePaths.karinaHoverOpenDoor },
      daniel: { hover: imagePaths.danielHover, hoverDoorOpen: imagePaths.danielHoverOpenDoor },
    };
  }

  protected override canInteractWithCharacter(): boolean {
    return !this.activeDialogue && !this.isQuizActive && !this.isAnimating;
  }

  public override get isMainViewActive(): boolean {
    return !this.isCoffeeMachineZoomed && !this.isLeftNoticeboardZoomed &&
           !this.isCoffeeTableZoomed && !this.isDeskZoomed &&
           !this.isStrategiesTableZoomed;
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

  // --- Override showDialogue to call updateBackground before typewriter ---
  override showDialogue(dialogue: Dialogue): void {
    this.activeDialogue = dialogue;
    this.updateBackground();
    this.startTypewriter();
  }

  // --- Background ---
  override updateBackground(): void {
    if (this.currentState === GameState.AllQuestsComplete ||
        this.currentState === GameState.AllQuestsComplete_Part2 ||
        this.currentState === GameState.AllQuestsComplete_Part3) {
      if (this.isDoorOpen) {
        this.currentBackgroundUrl = imagePaths.base_door_open;
        return;
      }
    }

    if (this.activeDialogue) {
      if (this.activeDialogue.character === this.t('characters.karina.name')) {
        this.currentBackgroundUrl = imagePaths.karinaTalking;
        return;
      } else if (this.activeDialogue.character === this.t('characters.daniel.name')) {
        this.currentBackgroundUrl = imagePaths.danielTalking;
        return;
      }
    }

    // Quiz 1 is given by Karina
    if (this.currentState === GameState.Quiz) {
      this.currentBackgroundUrl = imagePaths.karinaTalking;
      return;
    }

    // Puzzle 2 and 3 are given by Daniel
    if (this.currentState === GameState.PuzzleTwo || this.currentState === GameState.PuzzleThree) {
      this.currentBackgroundUrl = imagePaths.danielQuiz;
      return;
    }

    if (this.isCoffeeMachineZoomed) {
      this.currentBackgroundUrl = imagePaths.coffeeMachineZoomed;
    } else if (this.isLeftNoticeboardZoomed) {
      this.currentBackgroundUrl = imagePaths.leftNoticeboard;
    } else if (this.isCoffeeTableZoomed) {
      this.currentBackgroundUrl = imagePaths.coffeeTableZoomed;
    } else if (this.isDeskZoomed) {
      this.currentBackgroundUrl = imagePaths.deskZoomed;
    } else if (this.isStrategiesTableZoomed) {
      this.currentBackgroundUrl = imagePaths.strategiesTableZoomed;
    } else {
      this.currentBackgroundUrl = imagePaths.base;
    }
  }

  // --- Hotspot clicks ---
  override onHotspotClick(hotspot: string): void {

    // Main view hotspots
    if (hotspot === 'coffeeMachine' && this.currentState === GameState.FindNote && this.questStep === 0) {
      this.isCoffeeMachineZoomed = true;
      this.playSound('zoom-in.wav');
      this.zoomToLocation('coffeeMachine', this.hotspots.mainView, () => {
        this.resetZoom(true);
        this.updateBackground();
        setTimeout(() => {
          this.showDialogue({
            character: '',
            text: this.t('systemDialogues.coffeeMachineSearch')
          });
          this.questStep = 1;
        }, 800);
      });
      return;
    }

    if (hotspot === 'leftNoticeboard' && this.currentState === GameState.FindNote && this.questStep === 1) {
      this.isLeftNoticeboardZoomed = true;
      this.playSound('zoom-in.wav');
      this.zoomToLocation('leftNoticeboard', this.hotspots.mainView, () => {
        this.resetZoom(true);
        this.updateBackground();
      });
      return;
    }

    if (hotspot === 'zoomedLeftNoticeboardClick' && this.currentState === GameState.FindNote && this.questStep === 1) {
      this.showDialogue({
        character: '',
        text: this.t('systemDialogues.leftNoticeboardSearch')
      });
      this.questStep = 2;
      return;
    }

    if (hotspot === 'backCoffeeTable' && this.currentState === GameState.FindNote && this.questStep === 2) {
      this.isCoffeeTableZoomed = true;
      this.playSound('zoom-in.wav');
      this.zoomToLocation('backCoffeeTable', this.hotspots.mainView, () => {
        this.resetZoom(true);
        this.updateBackground();
      });
      return;
    }

    if (hotspot === 'plantWithNote' && this.currentState === GameState.FindNote) {
      this.isNoteVisible = true;
      this.playSound('success-chime.wav');
      return;
    }

    // Paper finding hotspots
    if (hotspot === 'desk' && this.currentState === GameState.FindPaper && this.questStep === 0) {
      this.isDeskZoomed = true;
      this.playSound('zoom-in.wav');
      this.zoomToLocation('desk', this.hotspots.mainView, () => {
        this.resetZoom(true);
        this.updateBackground();
        setTimeout(() => {
          this.showDialogue({
            character: '',
            text: this.t('systemDialogues.deskSearch')
          });
          this.questStep = 1;
          this.hasDeskHint = true;
        }, 800);
      });
      return;
    }

    if (hotspot === 'strategiesTable' && this.currentState === GameState.FindPaper && this.questStep >= 1) {
      this.isStrategiesTableZoomed = true;
      this.playSound('zoom-in.wav');
      this.zoomToLocation('strategiesTable', this.hotspots.mainView, () => {
        this.resetZoom(true);
        this.updateBackground();
      });
      return;
    }

    if (hotspot === 'notebook' && this.currentState === GameState.FindPaper) {
      this.isPaperVisible = true;
      this.playSound('success-chime.wav');
      return;
    }

    if (hotspot === 'exitDoor' && (this.currentState === GameState.AllQuestsComplete_Part3 || this.isDoorOpen)) {
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
      this.playSound('success-chime.wav');
      return;
    }
  }

  // --- Hint ---
  override requestHint(): void {
    this.showHints = true;
    this.showHintPulse();
    this.isHintDialogueActive = true;

    let hintText = this.t('hints.default');

    if (this.currentState === GameState.FindNote) {
      if (this.questStep === 0) hintText = this.t('hints.findNote.step0');
      else if (this.questStep === 1) hintText = this.t('hints.findNote.step1');
      else hintText = this.t('hints.findNote.step2');
    } else if (this.currentState === GameState.FindPaper) {
      if (this.questStep === 0) hintText = this.t('hints.findPaper.step0');
      else if (this.questStep === 1) hintText = this.t('hints.findPaper.step1');
      else hintText = this.t('hints.findPaper.step2');
    } else if (this.currentState === GameState.AllQuestsComplete ||
               this.currentState === GameState.AllQuestsComplete_Part2 ||
               this.currentState === GameState.AllQuestsComplete_Part3) {
      hintText = this.t('hints.allQuestsComplete');
    }

    this.showDialogue({ character: '', text: hintText });
  }

  // --- Dialogue dismissal ---
  override dismissDialogue(): void {
    // Handle hint dialogue - keep hints visible for 3 seconds after closing
    if (this.isHintDialogueActive) {
      this.isHintDialogueActive = false;
      this.showHintPulse();
    }

    // Save the character before clearing dialogue
    const lastCharacter = this.activeDialogue?.character || '';
    this.activeDialogue = null;
    this.displayedDialogueText = '';

    // Karina's introduction flow - auto-continue with Continue button
    if (this.currentState === GameState.Introduction) {
      this.currentState = GameState.Introduction_Part2;
      this.showDialogue({
        character: this.t('characters.karina.name'),
        text: this.t('characters.karina.dialogues.introduction_part2')
      });
      return;
    }

    if (this.currentState === GameState.Introduction_Part2) {
      this.currentState = GameState.FindNote;
      this.updateBackground();
      return;
    }

    // After finding note - if narrator dialogue, just close (user clicks Karina)
    // Karina's explanation flow continues only when she's talking
    if (this.currentState === GameState.NoteFound) {
      // Only auto-continue if this was Karina talking, not narrator
      if (lastCharacter === this.t('characters.karina.name')) {
        this.currentState = GameState.NoteFound_Part2;
        this.showDialogue({
          character: this.t('characters.karina.name'),
          text: this.t('characters.karina.dialogues.noteFound_part2')
        });
        return;
      }
      // Narrator dialogue - just close, user will click on Karina
      this.updateBackground();
      return;
    }

    if (this.currentState === GameState.NoteFound_Part2) {
      this.currentState = GameState.NoteFound_Part3;
      this.showDialogue({
        character: this.t('characters.karina.name'),
        text: this.t('characters.karina.dialogues.noteFound_part3')
      });
      return;
    }

    if (this.currentState === GameState.NoteFound_Part3) {
      this.currentState = GameState.Quiz;
      this.quizTitle = this.t('puzzles.quiz.title');
      this.quizQuestions = [
        {
          type: 'TrueFalse',
          text: this.t('puzzles.quiz.questions.0.text'),
          answer: false,
          hint: this.t('puzzles.quiz.questions.0.hint')
        },
        {
          type: 'TrueFalse',
          text: this.t('puzzles.quiz.questions.1.text'),
          answer: true,
          hint: this.t('puzzles.quiz.questions.1.hint')
        },
        {
          type: 'TrueFalse',
          text: this.t('puzzles.quiz.questions.2.text'),
          answer: false,
          hint: this.t('puzzles.quiz.questions.2.hint')
        }
      ];
      this.currentQuizQuestionIndex = 0;
      this.quizPositionClass = 'center';
      this.updateBackground();
      return;
    }

    // After Quiz 1 - Karina told user to go to Daniel, so transition to FindPaper
    if (this.currentState === GameState.QuizComplete) {
      this.currentState = GameState.FindPaper;
      this.questStep = 0;
      this.updateBackground();
      return;
    }

    // After finding paper - if narrator dialogue, just close (user clicks Daniel)
    if (this.currentState === GameState.PaperFound) {
      // Only auto-continue if this was Daniel talking, not narrator
      if (lastCharacter === this.t('characters.daniel.name')) {
        this.currentState = GameState.PaperFound_Part2;
        this.showDialogue({
          character: this.t('characters.daniel.name'),
          text: this.t('characters.daniel.dialogues.paperFound_part2')
        });
        return;
      }
      // Narrator dialogue - just close, user will click on Daniel
      this.updateBackground();
      return;
    }

    if (this.currentState === GameState.PaperFound_Part2) {
      this.currentState = GameState.PuzzleTwo;
      this.quizPositionClass = 'center-right';
      this.updateBackground();
      return;
    }

    // After all puzzles - Daniel's final flow
    if (this.currentState === GameState.AllQuestsComplete) {
      this.currentState = GameState.AllQuestsComplete_Part2;
      this.showDialogue({
        character: this.t('characters.daniel.name'),
        text: this.t('characters.daniel.dialogues.allQuestsComplete')
      });
      return;
    }

    // After AllQuestsComplete_Part2, open the door automatically
    if (this.currentState === GameState.AllQuestsComplete_Part2) {
      this.currentState = GameState.AllQuestsComplete_Part3;
      this.isDoorOpen = true;
      this.updateBackground();
      // Play door sound using preloaded audio
      setTimeout(() => {
        this.playDoorSound();
      }, ESCAPE_ROOM_TIMING.doorSoundDelay);
      return;
    }

    // When the user presses "Finish Training" on Daniel's final dialogue, finalize and show the completion overlay.
    // Guard with lastCharacter so a Karina-click dismissal in Part3 doesn't accidentally finish the training.
    if (this.currentState === GameState.AllQuestsComplete_Part3 && lastCharacter === this.t('characters.daniel.name')) {
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
      this.playSound('success-chime.wav');
      return;
    }

    this.updateBackground();
  }

  // --- Character clicks ---
  onCharacterClick(character: 'karina' | 'daniel'): void {
    const state = this.currentState;

    // Initial click on Karina starts the introduction
    if (character === 'karina' && state === GameState.Introduction) {
      this.showDialogue({
        character: this.t('characters.karina.name'),
        text: this.t('characters.karina.dialogues.introduction')
      });
      return;
    }

    // Click on Karina after finding sticky note
    if (character === 'karina' && state === GameState.NoteFound) {
      this.showDialogue({
        character: this.t('characters.karina.name'),
        text: this.t('characters.karina.dialogues.noteFound')
      });
      return;
    }

    // Click on Daniel after finding paper
    if (character === 'daniel' && state === GameState.PaperFound) {
      this.showDialogue({
        character: this.t('characters.daniel.name'),
        text: this.t('characters.daniel.dialogues.paperFound')
      });
      return;
    }

    // Fallback dialogues for characters when clicked in unexpected states
    if (character === 'karina') {
      if (state === GameState.FindNote) {
        this.showDialogue({
          character: this.t('characters.karina.name'),
          text: this.t('characters.karina.dialogues.fallback_findNote')
        });
      } else if (state === GameState.Quiz || state === GameState.PuzzleTwo || state === GameState.PuzzleThree) {
        this.showDialogue({
          character: this.t('characters.karina.name'),
          text: this.t('characters.karina.dialogues.fallback_quiz')
        });
      } else if (state === GameState.FindPaper || state === GameState.QuizComplete || state === GameState.QuizComplete_Part2) {
        this.showDialogue({
          character: this.t('characters.karina.name'),
          text: this.t('characters.karina.dialogues.fallback_findPaper')
        });
      } else if (state === GameState.AllQuestsComplete || state === GameState.AllQuestsComplete_Part2 || state === GameState.AllQuestsComplete_Part3) {
        this.showDialogue({
          character: this.t('characters.karina.name'),
          text: this.t('characters.karina.dialogues.allQuestsComplete')
        });
      } else {
        this.showDialogue({
          character: this.t('characters.karina.name'),
          text: this.t('characters.karina.dialogues.fallback_default')
        });
      }
      return;
    }

    if (character === 'daniel') {
      if (state === GameState.Introduction || state === GameState.Introduction_Part2) {
        this.showDialogue({
          character: this.t('characters.daniel.name'),
          text: this.t('characters.daniel.dialogues.introduction')
        });
      } else if (state === GameState.FindNote || state === GameState.NoteFound ||
                 state === GameState.NoteFound_Part2 || state === GameState.NoteFound_Part3 ||
                 state === GameState.NoteFound_Part4) {
        this.showDialogue({
          character: this.t('characters.daniel.name'),
          text: this.t('characters.daniel.dialogues.findNote')
        });
      } else if (state === GameState.Quiz) {
        this.showDialogue({
          character: this.t('characters.daniel.name'),
          text: this.t('characters.daniel.dialogues.fallback_quiz')
        });
      } else if (state === GameState.QuizComplete) {
        // First click on Daniel after Quiz 1 - he gives his dialogue about the paper
        this.currentState = GameState.FindPaper;
        this.questStep = 0;
        this.showDialogue({
          character: this.t('characters.daniel.name'),
          text: this.t('characters.daniel.dialogues.quizComplete')
        });
      } else if (state === GameState.FindPaper) {
        this.showDialogue({
          character: this.t('characters.daniel.name'),
          text: this.t('characters.daniel.dialogues.fallback_findPaper')
        });
      } else if (state === GameState.PuzzleTwo || state === GameState.PuzzleThree) {
        this.showDialogue({
          character: this.t('characters.daniel.name'),
          text: this.t('characters.daniel.dialogues.fallback_puzzle')
        });
      } else if (state === GameState.AllQuestsComplete || state === GameState.AllQuestsComplete_Part2 || state === GameState.AllQuestsComplete_Part3) {
        this.showDialogue({
          character: this.t('characters.daniel.name'),
          text: this.t('characters.daniel.dialogues.allQuestsComplete')
        });
      } else {
        this.showDialogue({
          character: this.t('characters.daniel.name'),
          text: this.t('characters.daniel.dialogues.fallback_default')
        });
      }
      return;
    }

    this.updateBackground();
  }

  // --- Zoom navigation ---
  protected override resetZoomState(): void {
    this.isCoffeeMachineZoomed = false;
    this.isLeftNoticeboardZoomed = false;
    this.isCoffeeTableZoomed = false;
    this.isDeskZoomed = false;
    this.isStrategiesTableZoomed = false;
  }

  // --- Quiz ---
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
      this.puzzle1TotalWrong++;

      // T/F: show correct answer briefly then auto-advance
      const correctAnswer = currentQuestion.answer;
      this.quizFeedback = correctAnswer
        ? this.t('puzzles.quiz.feedback.incorrect_true')
        : this.t('puzzles.quiz.feedback.incorrect_false');

      setTimeout(() => {
        this.isQuizWrong = false;
        this.quizFeedback = '';
        this.currentQuizQuestionIndex++;
        if (this.currentQuizQuestionIndex >= this.quizQuestions.length) {
          this.currentState = GameState.QuizComplete;
          this.isQuizCompleteOverlayVisible = true;
          this.recordPuzzleScore('Quiz', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
        }
      }, 1500);
    }
  }

  closeQuizCompleteOverlay(): void {
    this.playSound('success-chime.wav');
    this.isQuizCompleteOverlayVisible = false;
    this.currentState = GameState.QuizComplete;
    // Karina tells user to go to Daniel after Quiz 1
    this.showDialogue({
      character: this.t('characters.karina.name'),
      text: this.t('characters.karina.dialogues.quizComplete')
    });
  }

  // --- Puzzle Two ---
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
        this.quizFeedback = this.t('puzzles.puzzleTwo.hint');
      }
      setTimeout(() => this.isQuizWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Puzzle Three (Sequence) ---
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
      this.recordPuzzleScore('Sequence', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
      this.currentState = GameState.AllQuestsComplete;
      this.showDialogue({
        character: this.t('characters.daniel.name'),
        text: this.t('characters.daniel.dialogues.sequenceComplete')
      });
    } else {
      this.playSound('error-buzz.mp3');
      this.isQuizWrong = true;
      this.sequenceWrongAttempts++;
      this.puzzle3TotalWrong++;

      if (this.sequenceWrongAttempts >= 3) {
        this.puzzle3WasRevealed = true;
        this.puzzleThreeSequence = ['c', 'b', 'a', 'd'];
        this.answerOverlayText = this.t('puzzles.puzzleThree.answerOverlay');
        this.answerOverlayCallback = () => {
          this.sequenceWrongAttempts = 0;
          this.recordPuzzleScore('Sequence', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
          this.currentState = GameState.AllQuestsComplete;
          this.showDialogue({
            character: this.t('characters.daniel.name'),
            text: this.t('characters.daniel.dialogues.sequenceComplete')
          });
        };
        this.showAnswerOverlay = true;
      } else if (this.puzzleThreeSequence.length > 0 && this.puzzleThreeSequence[0] !== correctSequence[0]) {
        this.puzzleThreeFeedback = this.t('puzzles.puzzleThree.hints.position1');
      }
      else if (this.puzzleThreeSequence.length > 1 && this.puzzleThreeSequence[1] !== correctSequence[1]) {
        this.puzzleThreeFeedback = this.t('puzzles.puzzleThree.hints.position2');
      }
      else if (this.puzzleThreeSequence.length > 2 && this.puzzleThreeSequence[2] !== correctSequence[2]) {
        this.puzzleThreeFeedback = this.t('puzzles.puzzleThree.hints.position3');
      }
      else if (this.puzzleThreeSequence.length > 3 && this.puzzleThreeSequence[3] !== correctSequence[3]) {
        this.puzzleThreeFeedback = this.t('puzzles.puzzleThree.hints.position4');
      } else {
        this.puzzleThreeFeedback = this.t('puzzles.puzzleThree.hints.incomplete');
      }

      setTimeout(() => this.isQuizWrong = false, ESCAPE_ROOM_TIMING.sequenceShakeTimeout);
    }
  }

  // --- Override closeAnswerOverlay to also clear puzzleThreeFeedback ---
  override closeAnswerOverlay(): void {
    this.showAnswerOverlay = false;
    this.puzzleThreeFeedback = '';
    this.quizFeedback = '';
    if (this.answerOverlayCallback) {
      this.answerOverlayCallback();
      this.answerOverlayCallback = null;
    }
  }

  // --- Item interactions ---
  closeNote(): void {
    this.isNoteVisible = false;
    if (!this.hasFoundNote) {
      this.hasFoundNote = true;
      this.currentState = GameState.NoteFound;
      this.goBack();
      this.showDialogue({ character: '', text: this.t('systemDialogues.noteFoundReturn') });
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
        this.showDialogue({ character: '', text: this.t('systemDialogues.paperFoundReturn') });
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
    this.showDialogue({
      character: this.t('characters.daniel.name'),
      text: this.t('characters.daniel.dialogues.sequenceComplete')
    });
    this.updateBackground();
  }
}

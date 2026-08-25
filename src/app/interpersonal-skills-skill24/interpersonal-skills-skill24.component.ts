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
  SelfTalk,
  TalkToCarlos1,
  FindMagazine,
  ReadMagazine,
  TalkToCarlos2,
  Puzzle1_TrueFalse,
  Puzzle1Complete,
  FindFolder,
  ReadFolder,
  TalkToCarlos3,
  Puzzle2_SingleChoice,
  Puzzle2Complete,
  Puzzle3_SequenceOrder,
  Reveal,
  Completion
}

const imagePaths = {
  base_empty: '/assets/images/interpersonal_skills/reception.png',
  base: '/assets/images/interpersonal_skills/reception_default.png',
  base_door_open: '/assets/images/interpersonal_skills/reception_door_open.png',
  carlos_hover: '/assets/images/interpersonal_skills/carlos_hover.png',
  carlos_talking: '/assets/images/interpersonal_skills/carlos_talking.png',
  carlos_hover_door_open: '/assets/images/interpersonal_skills/carlos_hover_door_open.png',
  sarah_hover: '/assets/images/interpersonal_skills/sarah_hover.png',
  sarah_talking: '/assets/images/interpersonal_skills/sarah_talking.png',
  sarah_hover_door_open: '/assets/images/interpersonal_skills/sarah_hover_door_open.png',
  zoom_coffeeTable: '/assets/images/interpersonal_skills/zoom_coffee_table.png',
  zoom_bookshelf: '/assets/images/interpersonal_skills/zoom_bookshelf.png',
  magazine: '/assets/images/interpersonal_skills/magazine.png',
  folder: '/assets/images/interpersonal_skills/folder.png',
};

type ViewState = 'main' | 'coffeeTable' | 'bookshelf';

const roomConfig: EscapeRoomConfig = {
  roomId: 'interpersonal-skills',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
  selector: 'app-interpersonal-skills-skill24',
  templateUrl: './interpersonal-skills-skill24.component.html',
  styleUrl: './interpersonal-skills-skill24.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule, DragDropModule],
  animations: [fadeInOut]
})
export class InterpersonalSkillsSkill24Component extends EscapeRoomBaseComponent {

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
  isMagazineVisible: boolean = false;
  isFolderVisible: boolean = false;

  // Item found flags
  hasFoundMagazine: boolean = false;
  hasFoundFolder: boolean = false;

  // Track vending machine click (wrong click before coffee table)
  hasClickedVendingMachine: boolean = false;

  hotspots = {
    main: {
      carlos: { x: 19, y: 28, width: 13, height: 51 },
      sarah: { x: 48, y: 53, width: 24, height: 47 },
      coffeeTable: { x: 36, y: 75, width: 16, height: 17 },
      vendingMachine: { x: 53, y: 35, width: 9, height: 30 },
      bookshelf: { x: 0, y: 0, width: 20, height: 63 },
      corkboard: { x: 27, y: 24, width: 26, height: 28 },
      exitDoor: { x: 71, y: 25, width: 12, height: 49 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    coffeeTable_zoom: {
      magazine: { x: 51, y: 47, width: 45, height: 22 },
    },
    bookshelf_zoom: {
      folder: { x: 47, y: 68, width: 17, height: 25 },
    }
  };

  // --- Puzzle 1: True/False (3 questions) ---
  currentTFQuestion: number = 0;
  tfWrongAttempts: number = 0;
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

  // --- Puzzle 3: Sequence Ordering (4 items) ---
  userSequence: string[] = [];
  puzzle3WrongAttempts: number = 0;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  override get characterImages(): CharacterImageMap {
    return {
      carlos: { hover: imagePaths.carlos_hover, hoverDoorOpen: imagePaths.carlos_hover_door_open },
      sarah: { hover: imagePaths.sarah_hover, hoverDoorOpen: imagePaths.sarah_hover_door_open },
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
    if (this.isQuizActive) { this.currentBackgroundUrl = imagePaths.carlos_talking; return; }
    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }
    switch (this.currentView) {
      case 'coffeeTable': this.currentBackgroundUrl = imagePaths.zoom_coffeeTable; break;
      case 'bookshelf': this.currentBackgroundUrl = imagePaths.zoom_bookshelf; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  protected override onHintRequested(): void { this.isHintDialogue = true; }

  protected override getHintText(): string {
    if (this.currentState === GameState.TalkToCarlos1) return this.t('hints.talkToCarlos');
    if (this.currentState === GameState.FindMagazine) return this.t('hints.findMagazine');
    if (this.currentState === GameState.TalkToCarlos2) return this.t('hints.talkToCarlos2');
    if (this.currentState === GameState.Puzzle1_TrueFalse) return this.t('hints.puzzle1');
    if (this.currentState === GameState.FindFolder) return this.t('hints.findFolder');
    if (this.currentState === GameState.TalkToCarlos3) return this.t('hints.talkToCarlos3');
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

    if (target === 'carlos') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.carlos_talking;
      this.handleCarlosInteraction();
      return;
    }

    if (target === 'sarah') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.sarah_talking;
      const name = this.t('characters.sarah.name');
      this.showDialogue({ character: name, text: this.t('characters.sarah.dialogues.busy'), id: 'sarah_busy' });
      return;
    }

    if (this.currentView === 'main') {
      // Vending machine click during FindMagazine (wrong spot)
      if (target === 'vendingMachine' && this.currentState === GameState.FindMagazine && !this.hasClickedVendingMachine) {
        this.hasClickedVendingMachine = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickVendingMachine'), id: 'system_clickVendingMachine' });
        return;
      }

      // Coffee table click during FindMagazine
      if ((target === 'coffeeTable' || (target === 'vendingMachine' && this.hasClickedVendingMachine)) && this.currentState === GameState.FindMagazine) {
        this.zoomToLocation('coffeeTable', this.hotspots.main, () => {
          this.currentView = 'coffeeTable';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on magazine within zoomed view
        }, 2.5);
        return;
      }

      // Corkboard click during FindFolder (wrong spot)
      if (target === 'corkboard' && this.currentState === GameState.FindFolder) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickBookshelfWrong'), id: 'system_clickBookshelfWrong' });
        return;
      }

      // Bookshelf click during FindFolder
      if (target === 'bookshelf' && this.currentState === GameState.FindFolder) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'bookshelf';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on folder within zoomed view
        }, 2.5);
        return;
      }
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'coffeeTable' && target === 'magazine' && this.currentState === GameState.FindMagazine) {
      this.playSound('success-chime.wav');
      this.hasFoundMagazine = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundMagazine'), id: 'system_foundMagazine' });
      return;
    }

    if (this.currentView === 'bookshelf' && target === 'folder' && this.currentState === GameState.FindFolder) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundFolder = true;
      this.isFolderVisible = true;
      return;
    }
  }

  handleCarlosInteraction(): void {
    const name = this.t('characters.carlos.name');
    if (this.currentState === GameState.TalkToCarlos1) {
      this.showDialogue({ character: name, text: this.t('characters.carlos.dialogues.greet'), id: 'carlos_greet' });
    } else if (this.currentState === GameState.TalkToCarlos2) {
      this.showDialogue({ character: name, text: this.t('characters.carlos.dialogues.magazineFound'), id: 'carlos_magazineFound' });
    } else if (this.currentState === GameState.Puzzle1Complete) {
      this.showDialogue({ character: name, text: this.t('characters.carlos.dialogues.quiz1Done'), id: 'carlos_quiz1Done' });
    } else if (this.currentState === GameState.TalkToCarlos3) {
      this.showDialogue({ character: name, text: this.t('characters.carlos.dialogues.folderFound'), id: 'carlos_folderFound' });
    } else if (this.currentState === GameState.Completion) {
      this.showDialogue({ character: name, text: this.t('characters.carlos.dialogues.completion'), id: 'carlos_completion' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.carlos.dialogues.default'), id: 'carlos_default' });
    }
  }

  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;
    this.updateBackground();

    if (this.isHintDialogue) { this.isHintDialogue = false; this.showHintPulse(); }
    else { this.showHints = false; }

    const carlosName = this.t('characters.carlos.name');

    if (this.currentView !== 'main' && !['system_foundMagazine'].includes(id || '')) {
      this.currentView = 'main';
    }

    if (id === 'system_selfTalk') { this.currentState = GameState.TalkToCarlos1; }
    else if (id === 'carlos_greet') {
      this.showDialogue({ character: carlosName, text: this.t('characters.carlos.dialogues.findMagazine'), id: 'carlos_findMagazine' });
    }
    else if (id === 'carlos_findMagazine') { this.currentState = GameState.FindMagazine; }
    else if (id === 'system_clickVendingMachine') { /* player should now click coffee table */ }
    else if (id === 'system_foundMagazine') {
      this.isMagazineVisible = true;
    }
    else if (id === 'system_magazineRead') {
      this.currentView = 'main';
      this.currentState = GameState.TalkToCarlos2;
      this.updateBackground();
    }
    else if (id === 'carlos_magazineFound') {
      this.showDialogue({ character: carlosName, text: this.t('characters.carlos.dialogues.quiz1Intro'), id: 'carlos_quiz1Intro' });
    }
    else if (id === 'carlos_quiz1Intro') {
      this.currentState = GameState.Puzzle1_TrueFalse;
      this.currentTFQuestion = 0;
      this.updateBackground();
    }
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'carlos_quiz1Done') {
      this.showDialogue({ character: carlosName, text: this.t('characters.carlos.dialogues.findFolder'), id: 'carlos_findFolder' });
    }
    else if (id === 'carlos_findFolder') { this.currentState = GameState.FindFolder; }
    else if (id === 'system_clickBookshelfWrong') { /* player should look for the folder on bookshelf */ }
    else if (id === 'system_foundFolder') {
      this.currentState = GameState.TalkToCarlos3;
    }
    else if (id === 'carlos_folderFound') {
      this.showDialogue({ character: carlosName, text: this.t('characters.carlos.dialogues.puzzle2Intro'), id: 'carlos_puzzle2Intro' });
    }
    else if (id === 'carlos_puzzle2Intro') {
      this.currentState = GameState.Puzzle2_SingleChoice;
      this.updateBackground();
    }
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'system_puzzle3Complete') {
      // State already changed before dialogue was shown
      this.showDialogue({ character: carlosName, text: this.t('characters.carlos.dialogues.finalWords'), id: 'carlos_finalWords' });
    }
    else if (id === 'carlos_finalWords') {
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

  closeMagazine(): void {
    this.isMagazineVisible = false;
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.magazineRead'), id: 'system_magazineRead' });
  }

  closeFolder(): void {
    this.isFolderVisible = false;
    this.goBack();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundFolder'), id: 'system_foundFolder' });
  }

  toggleMagazine(): void {
    if (this.hasFoundMagazine) {
      this.playSound('paper-rustle.wav');
      this.isMagazineVisible = !this.isMagazineVisible;
      this.isFolderVisible = false;
    }
  }

  toggleFolder(): void {
    if (this.hasFoundFolder) {
      this.playSound('paper-rustle.wav');
      this.isFolderVisible = !this.isFolderVisible;
      this.isMagazineVisible = false;
    }
  }

  // --- Skip Puzzle Methods ---

  skipPuzzle1(): void {
    this.recordPuzzleScore('True/False', 99, true);
    this.currentState = GameState.Puzzle1Complete;
    this.puzzleFeedback = '';
    this.updateBackground();
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Single Choice', 99, true);
    this.currentState = GameState.Puzzle2Complete;
    this.initSequenceOrder();
    this.currentState = GameState.Puzzle3_SequenceOrder;
    this.puzzleFeedback = '';
    this.updateBackground();
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Sequence Order', 99, true);
    this.currentView = 'main';
    this.currentState = GameState.Reveal;
    this.puzzleFeedback = '';
    this.updateBackground();
    const carlosName = this.t('characters.carlos.name');
    this.showDialogue({ character: carlosName, text: this.t('characters.carlos.dialogues.finalWords'), id: 'carlos_finalWords' });
  }

  // --- Puzzle 1: True/False ---

  submitTrueFalse(answer: boolean): void {
    const questions = [false, true, false]; // correct answers for Q1, Q2, Q3
    const correct = questions[this.currentTFQuestion] === answer;

    if (correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.currentTFQuestion++;
      if (this.currentTFQuestion >= 3) {
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
        if (this.currentTFQuestion >= 3) {
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

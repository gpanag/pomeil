import { Component, Inject, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
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

import { RoomHelpButtonComponent } from '../shared/escape-room/room-help-button/room-help-button.component';
enum GameState {
  Intro,
  TalkToPriya1,
  TalkToOleh1,
  FindFolder,
  ReadFolder,
  TalkToOleh2,
  Puzzle1_TrueFalse,
  Puzzle1Complete,
  FindPoster,
  ReadPoster,
  TalkToPriya2,
  Puzzle2_SingleChoice,
  Puzzle2Complete,
  Puzzle3_SequenceOrder,
  Reveal,
  Completion
}

const imagePaths = {
  base_empty: '/assets/images/teamwork/coworking_room.png',
  base: '/assets/images/teamwork/coworking_room_default.png',
  base_door_open: '/assets/images/teamwork/coworking_room_door_open.png',
  priya_hover: '/assets/images/teamwork/priya_hover.png',
  priya_talking: '/assets/images/teamwork/priya_talking.png',
  priya_hover_door_open: '/assets/images/teamwork/priya_hover_door_open.png',
  oleh_hover: '/assets/images/teamwork/oleh_hover.png',
  oleh_talking: '/assets/images/teamwork/oleh_talking.png',
  oleh_hover_door_open: '/assets/images/teamwork/oleh_hover_door_open.png',
  zoom_notice_board: '/assets/images/teamwork/zoom_notice_board.png',
  zoom_back_table: '/assets/images/teamwork/zoom_back_table.png',
  zoom_front_desk: '/assets/images/teamwork/zoom_front_desk.png',
  folder: '/assets/images/teamwork/folder.png',
  poster: '/assets/images/teamwork/poster.png',
};

type ViewState = 'main' | 'notice_board' | 'back_table' | 'front_desk';

const roomConfig: EscapeRoomConfig = {
  roomId: 'teamwork',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
    selector: 'app-teamwork-skill29',
    templateUrl: './teamwork-skill29.component.html',
    styleUrl: './teamwork-skill29.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule, DragDropModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class TeamworkSkill29Component extends EscapeRoomBaseComponent {

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
  isPosterVisible: boolean = false;

  // Item found flags
  hasFoundFolder: boolean = false;
  hasFoundPoster: boolean = false;

  // Track search clicks for folder quest
  hasClickedNoticeBoard: boolean = false;
  hasClickedBackTable: boolean = false;

  // Track search clicks for poster quest
  hasClickedDeskForPoster: boolean = false;
  hasClickedNoticeBoardForPoster: boolean = false;

  hotspots = {
    main: {
      oleh: { x: 23, y: 18, width: 18, height: 49 },
      priya: { x: 53, y: 30, width: 15, height: 70 },
      noticeBoard: { x: 40, y: 33, width: 16, height: 17 },
      backTable: { x: 19, y: 54, width: 12, height: 10 },
      frontDesk: { x: 0, y: 62, width: 35, height: 25 },
      laptops: { x: 18, y: 64, width: 14, height: 18 },
      exitDoor: { x: 76, y: 0, width: 20, height: 100 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    front_desk_zoom: {
      folder: { x: 42, y: 62, width: 42, height: 34 },
    },
    back_table_zoom: {
      poster: { x: 15, y: 0, width: 85, height: 100 },
      content: { x: 15, y: 0, width: 85, height: 100 },
    }
  };

  // --- Puzzle 1: True/False (5 questions) ---
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
      priya: { hover: imagePaths.priya_hover, hoverDoorOpen: imagePaths.priya_hover_door_open },
      oleh: { hover: imagePaths.oleh_hover, hoverDoorOpen: imagePaths.oleh_hover_door_open },
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
    if (this.isQuizActive) { this.currentBackgroundUrl = imagePaths.oleh_talking; return; }
    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }
    switch (this.currentView) {
      case 'notice_board': this.currentBackgroundUrl = imagePaths.zoom_notice_board; break;
      case 'back_table': this.currentBackgroundUrl = imagePaths.zoom_back_table; break;
      case 'front_desk': this.currentBackgroundUrl = imagePaths.zoom_front_desk; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  protected override onHintRequested(): void { this.isHintDialogue = true; }

  protected override getHintText(): string {
    if (this.currentState === GameState.TalkToPriya1) return this.t('hints.intro');
    if (this.currentState === GameState.TalkToOleh1) return this.t('hints.talkToOleh');
    if (this.currentState === GameState.FindFolder) return this.t('hints.findFolder');
    if (this.currentState === GameState.TalkToOleh2) return this.t('hints.talkToOleh2');
    if (this.currentState === GameState.Puzzle1_TrueFalse) return this.t('hints.puzzle1');
    if (this.currentState === GameState.Puzzle1Complete) return this.t('hints.talkToPriya2');
    if (this.currentState === GameState.FindPoster) return this.t('hints.findPoster');
    if (this.currentState === GameState.TalkToPriya2) return this.t('hints.talkToPriya2');
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

    if (target === 'priya') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.priya_talking;
      this.handlePriyaInteraction();
      return;
    }

    if (target === 'oleh') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.oleh_talking;
      this.handleOlehInteraction();
      return;
    }

    if (this.currentView === 'main') {
      // --- Folder quest (FindFolder state) ---
      // Step 1: notice board
      if (target === 'noticeBoard' && this.currentState === GameState.FindFolder && !this.hasClickedNoticeBoard) {
        this.hasClickedNoticeBoard = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickNoticeBoard'), id: 'system_clickNoticeBoard' });
        return;
      }

      // Step 2: back table (conference room table)
      if (target === 'backTable' && this.currentState === GameState.FindFolder && this.hasClickedNoticeBoard && !this.hasClickedBackTable) {
        this.hasClickedBackTable = true;
        this.zoomToLocation('backTable', this.hotspots.main, () => {
          this.currentView = 'back_table';
          this.updateBackground();
          this.resetZoom(true);
          // Player must click hotspot within zoomed view to trigger dialogue
        }, 2.5);
        return;
      }

      // Step 3: front desk — zoom in, player must click folder sub-hotspot
      if (target === 'frontDesk' && this.currentState === GameState.FindFolder && this.hasClickedNoticeBoard && this.hasClickedBackTable) {
        this.zoomToLocation('frontDesk', this.hotspots.main, () => {
          this.currentView = 'front_desk';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on folder within zoomed view
        }, 2.5);
        return;
      }

      // --- Poster quest (FindPoster state) ---
      // Step 1: desk
      if (target === 'frontDesk' && this.currentState === GameState.FindPoster && !this.hasClickedDeskForPoster) {
        this.hasClickedDeskForPoster = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickDesk'), id: 'system_clickDesk' });
        return;
      }

      // Step 2: notice board
      if (target === 'noticeBoard' && this.currentState === GameState.FindPoster && this.hasClickedDeskForPoster && !this.hasClickedNoticeBoardForPoster) {
        this.hasClickedNoticeBoardForPoster = true;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickNoticeBoardPoster'), id: 'system_clickNoticeBoardPoster' });
        return;
      }

      // Step 3: laptops at back — zoom in, player must click poster sub-hotspot
      if ((target === 'laptops' || target === 'backTable') && this.currentState === GameState.FindPoster && this.hasClickedDeskForPoster && this.hasClickedNoticeBoardForPoster) {
        this.zoomToLocation('backTable', this.hotspots.main, () => {
          this.currentView = 'back_table';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on poster within zoomed view
        }, 2.5);
        return;
      }
    }

    // --- Click within back_table zoomed view (step 2 of folder quest) ---
    if (this.currentView === 'back_table' && target === 'backTableContent' && this.currentState === GameState.FindFolder && this.hasClickedBackTable) {
      this.playSound('paper-rustle.wav', 700);
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.clickBackTable'), id: 'system_clickBackTable' });
      return;
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'front_desk' && target === 'folder' && this.currentState === GameState.FindFolder) {
      this.playSound('success-chime.wav');
      this.hasFoundFolder = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundFolder'), id: 'system_foundFolder' });
      return;
    }

    if (this.currentView === 'back_table' && target === 'poster' && this.currentState === GameState.FindPoster) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav', 700);
      this.hasFoundPoster = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundPoster'), id: 'system_foundPoster' });
      return;
    }
  }

  handlePriyaInteraction(): void {
    const name = this.t('characters.priya.name');
    if (this.currentState === GameState.TalkToPriya1) {
      this.showDialogue({ character: name, text: this.t('characters.priya.dialogues.greet'), id: 'priya_greet' });
    } else if (this.currentState === GameState.Puzzle1Complete) {
      this.showDialogue({ character: name, text: this.t('characters.priya.dialogues.quiz1Done'), id: 'priya_quiz1Done' });
    } else if (this.currentState === GameState.TalkToPriya2) {
      this.showDialogue({ character: name, text: this.t('characters.priya.dialogues.posterFound'), id: 'priya_posterFound' });
    } else if (this.currentState === GameState.Completion) {
      this.showDialogue({ character: name, text: this.t('characters.priya.dialogues.completion'), id: 'priya_completion' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.priya.dialogues.default'), id: 'priya_default' });
    }
  }

  handleOlehInteraction(): void {
    const name = this.t('characters.oleh.name');
    if (this.currentState === GameState.TalkToOleh1) {
      this.showDialogue({ character: name, text: this.t('characters.oleh.dialogues.greet'), id: 'oleh_greet' });
    } else if (this.currentState === GameState.TalkToOleh2) {
      this.showDialogue({ character: name, text: this.t('characters.oleh.dialogues.folderFound'), id: 'oleh_folderFound' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.oleh.dialogues.default'), id: 'oleh_default' });
    }
  }

  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;
    this.updateBackground();

    if (this.isHintDialogue) { this.isHintDialogue = false; this.showHintPulse(); }
    else { this.showHints = false; }

    const priyaName = this.t('characters.priya.name');
    const olehName = this.t('characters.oleh.name');

    if (this.currentView !== 'main' && !['system_foundFolder', 'system_foundPoster'].includes(id || '')) {
      this.currentView = 'main';
    }

    // --- Intro flow: selfTalk → click Priya → Priya greets → introduces Oleh ---
    if (id === 'system_selfTalk') { this.currentState = GameState.TalkToPriya1; }
    else if (id === 'priya_greet') {
      this.currentState = GameState.TalkToOleh1;
    }

    // --- Oleh greet → find folder instructions ---
    else if (id === 'oleh_greet') {
      this.showDialogue({ character: olehName, text: this.t('characters.oleh.dialogues.findFolder'), id: 'oleh_findFolder' });
    }
    else if (id === 'oleh_findFolder') {
      this.showDialogue({ character: olehName, text: this.t('characters.oleh.dialogues.findFolderInstructions'), id: 'oleh_findFolderInstructions' });
    }
    else if (id === 'oleh_findFolderInstructions') { this.currentState = GameState.FindFolder; }

    // --- Folder quest dialogue chain ---
    else if (id === 'system_clickNoticeBoard') { /* player should now click back table */ }
    else if (id === 'system_clickBackTable') {
      this.currentView = 'main';
      this.updateBackground();
      /* player should now click front desk */
    }
    else if (id === 'system_foundFolder') {
      this.isFolderVisible = true;
    }
    else if (id === 'system_folderOpened') {
      this.currentView = 'main';
      this.updateBackground();
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.folderRead'), id: 'system_folderRead' });
    }
    else if (id === 'system_folderRead') {
      this.currentState = GameState.TalkToOleh2;
      this.updateBackground();
    }

    // --- Oleh after folder found → teamwork info → quiz intro ---
    else if (id === 'oleh_folderFound') {
      this.showDialogue({ character: olehName, text: this.t('characters.oleh.dialogues.teamworkInfo'), id: 'oleh_teamworkInfo' });
    }
    else if (id === 'oleh_teamworkInfo') {
      this.showDialogue({ character: olehName, text: this.t('characters.oleh.dialogues.quiz1Intro'), id: 'oleh_quiz1Intro' });
    }
    else if (id === 'oleh_quiz1Intro') {
      this.currentState = GameState.Puzzle1_TrueFalse;
      this.currentTFQuestion = 0;
      this.updateBackground();
    }

    // --- After Puzzle 1 complete → Priya says quiz1Done → find poster ---
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    else if (id === 'priya_quiz1Done') {
      this.showDialogue({ character: priyaName, text: this.t('characters.priya.dialogues.findPoster'), id: 'priya_findPoster' });
    }
    else if (id === 'priya_findPoster') {
      this.showDialogue({ character: priyaName, text: this.t('characters.priya.dialogues.findPosterInstructions'), id: 'priya_findPosterInstructions' });
    }
    else if (id === 'priya_findPosterInstructions') { this.currentState = GameState.FindPoster; }

    // --- Poster quest dialogue chain ---
    else if (id === 'system_clickDesk') { /* player should now click notice board */ }
    else if (id === 'system_clickNoticeBoardPoster') { /* player should now click laptops at back */ }
    else if (id === 'system_foundPoster') {
      this.isPosterVisible = true;
    }
    else if (id === 'system_posterRead') {
      this.currentView = 'main';
      this.currentState = GameState.TalkToPriya2;
      this.updateBackground();
    }

    // --- Priya after poster found → puzzle 2 intro ---
    else if (id === 'priya_posterFound') {
      this.showDialogue({ character: priyaName, text: this.t('characters.priya.dialogues.puzzle2Intro'), id: 'priya_puzzle2Intro' });
    }
    else if (id === 'priya_puzzle2Intro') {
      this.currentState = GameState.Puzzle2_SingleChoice;
      this.updateBackground();
    }

    // --- After Puzzle 2 → Puzzle 3 ---
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
    }

    // --- After Puzzle 3 → final words → completion ---
    else if (id === 'system_puzzle3Complete') {
      // State already changed before dialogue was shown
      this.showDialogue({ character: priyaName, text: this.t('characters.priya.dialogues.finalWords'), id: 'priya_finalWords' });
    }
    else if (id === 'priya_finalWords') {
      this.showDialogue({ character: priyaName, text: this.t('characters.priya.dialogues.completion'), id: 'priya_completionMsg' });
    }
    else if (id === 'priya_completionMsg') {
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
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.folderOpened'), id: 'system_folderOpened' });
  }

  closePoster(): void {
    this.isPosterVisible = false;
    this.goBack();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundPoster'), id: 'system_posterRead' });
  }

  toggleFolder(): void {
    if (this.hasFoundFolder) {
      this.playSound('paper-rustle.wav', 700);
      this.isFolderVisible = !this.isFolderVisible;
      this.isPosterVisible = false;
    }
  }

  togglePoster(): void {
    if (this.hasFoundPoster) {
      this.playSound('paper-rustle.wav', 700);
      this.isPosterVisible = !this.isPosterVisible;
      this.isFolderVisible = false;
    }
  }

  skipPuzzle1(): void {
    this.recordPuzzleScore('True/False', 99, true);
    this.puzzleFeedback = '';
    this.currentTFQuestion = 5;
    this.currentState = GameState.Puzzle1Complete;
    this.updateBackground();
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Single Choice', 99, true);
    this.puzzleFeedback = '';
    this.puzzle2WrongAttempts = 0;
    this.initSequenceOrder();
    this.currentState = GameState.Puzzle3_SequenceOrder;
    this.updateBackground();
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Sequence Order', 99, true);
    this.puzzleFeedback = '';
    this.puzzle3WrongAttempts = 0;
    this.currentView = 'main';
    this.currentState = GameState.Reveal;
    this.updateBackground();
    const priyaName = this.t('characters.priya.name');
    this.showDialogue({ character: priyaName, text: this.t('characters.priya.dialogues.finalWords'), id: 'priya_finalWords' });
  }

  // --- Puzzle 1: True/False (5 questions) ---

  submitTrueFalse(answer: boolean): void {
    const questions = [true, false, true, false, true]; // correct answers for Q1-Q5
    const correct = questions[this.currentTFQuestion] === answer;

    if (correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.currentTFQuestion++;
      if (this.currentTFQuestion >= 5) {
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
        if (this.currentTFQuestion >= 5) {
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

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
  TalkToMateo1,
  FindPaper,
  ReadPaper,
  TalkToMateo2,
  ClickLaptop1,
  Puzzle1_MultiChoice,
  Puzzle1Complete,
  Conversation,
  ClickLaptop2,
  Puzzle2_FillGap,
  Puzzle2Complete,
  FindPendrive,
  ClickLaptop3,
  ReadTextFile,
  TalkToZainabu,
  ClickLaptop4,
  Puzzle3_Matching,
  Reveal,
  Completion
}

const imagePaths = {
  base_empty: '/assets/images/active_listening/rooftop.png',
  base: '/assets/images/active_listening/rooftop_default.png',
  base_door_open: '/assets/images/active_listening/rooftop_door_open.png',
  zainabu_hover: '/assets/images/active_listening/zainabu_hover.png',
  zainabu_talking: '/assets/images/active_listening/zainabu_talking.png',
  zainabu_hover_door_open: '/assets/images/active_listening/zainabu_hover_door_open.png',
  mateo_hover: '/assets/images/active_listening/mateo_hover.png',
  mateo_talking: '/assets/images/active_listening/mateo_talking.png',
  mateo_hover_door_open: '/assets/images/active_listening/mateo_hover_door_open.png',
  zoom_plants: '/assets/images/active_listening/zoom_plants.png',
  zoom_laptop: '/assets/images/active_listening/zoom_laptop.png',
  zoom_floor: '/assets/images/active_listening/zoom_floor.png',
  paper: '/assets/images/active_listening/paper.png',
  pendrive: '/assets/images/active_listening/pendrive.png',
};

type ViewState = 'main' | 'plants' | 'laptop' | 'floor';

const roomConfig: EscapeRoomConfig = {
  roomId: 'active-listening',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
    selector: 'app-active-listening-skill19',
    templateUrl: './active-listening-skill19.component.html',
    styleUrl: './active-listening-skill19.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class ActiveListeningSkill19Component extends EscapeRoomBaseComponent {

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
  isPaperVisible: boolean = false;
  isTextFileVisible: boolean = false;

  // Item found flags
  hasFoundPaper: boolean = false;
  hasFoundPendrive: boolean = false;

  hotspots = {
    main: {
      zainabu: { x: 35, y: 34, width: 14, height: 41 },
      mateo: { x: 51, y: 36, width: 18, height: 50 },
      plants: { x: 0, y: 65, width: 34, height: 58 },
      laptop: { x: 45, y: 51, width: 10, height: 10 },
      floor: { x: 5, y: 60, width: 35, height: 25 },
      exitDoor: { x: 67, y: 17, width: 11, height: 41 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    plants_zoom: {
      paper: { x: 69, y: 52, width: 15, height: 7 },
    },
    floor_zoom: {
      pendrive: { x: 47, y: 66, width: 14, height: 11 },
    },
    laptop_zoom: {
      content: { x: 15, y: 15, width: 70, height: 70 },
    }
  };

  // --- Puzzle 1: Multiple Choice (2 correct out of 4) ---
  get multiChoiceOptions() {
    return [
      { id: 'a', text: this.t('puzzles.multiChoice.options.a'), correct: false },
      { id: 'b', text: this.t('puzzles.multiChoice.options.b'), correct: true },
      { id: 'c', text: this.t('puzzles.multiChoice.options.c'), correct: false },
      { id: 'd', text: this.t('puzzles.multiChoice.options.d'), correct: true }
    ];
  }
  selectedMultiOptions: string[] = [];
  puzzle1WrongAttempts: number = 0;
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;

  // --- Puzzle 2: Fill-the-Gap (5 blanks) ---
  get gapSentenceParts() {
    return [
      this.t('puzzles.fillGap.sentenceParts.0'),
      this.t('puzzles.fillGap.sentenceParts.1'),
      this.t('puzzles.fillGap.sentenceParts.2'),
      this.t('puzzles.fillGap.sentenceParts.3'),
      this.t('puzzles.fillGap.sentenceParts.4'),
      this.t('puzzles.fillGap.sentenceParts.5')
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
  userGapAnswers: string[] = [null!, null!, null!, null!, null!];
  gapWrongAttempts: number = 0;
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;

  // --- Puzzle 3: Matching (5 pairs) ---
  get matchingPairs() {
    return [
      { id: '1', cue: this.t('puzzles.matching.columnA.items.1'), stateId: 'B' },
      { id: '2', cue: this.t('puzzles.matching.columnA.items.2'), stateId: 'E' },
      { id: '3', cue: this.t('puzzles.matching.columnA.items.3'), stateId: 'C' },
      { id: '4', cue: this.t('puzzles.matching.columnA.items.4'), stateId: 'A' },
      { id: '5', cue: this.t('puzzles.matching.columnA.items.5'), stateId: 'D' }
    ];
  }
  get matchingOptions() {
    return [
      { id: 'A', text: this.t('puzzles.matching.columnB.items.A') },
      { id: 'B', text: this.t('puzzles.matching.columnB.items.B') },
      { id: 'C', text: this.t('puzzles.matching.columnB.items.C') },
      { id: 'D', text: this.t('puzzles.matching.columnB.items.D') },
      { id: 'E', text: this.t('puzzles.matching.columnB.items.E') }
    ];
  }
  selectedCueId: string | null = null;
  solvedMatches: string[] = [];
  matchingWrongAttempts: number = 0;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  override get characterImages(): CharacterImageMap {
    return {
      mateo: { hover: imagePaths.mateo_hover, hoverDoorOpen: imagePaths.mateo_hover_door_open },
      zainabu: { hover: imagePaths.zainabu_hover, hoverDoorOpen: imagePaths.zainabu_hover_door_open },
    };
  }

  protected override canInteractWithCharacter(): boolean {
    return this.currentView === 'main' && !this.activeDialogue && !this.isAnimating;
  }

  public override get isMainViewActive(): boolean {
    return this.currentView === 'main';
  }

  public override get isQuizActive(): boolean {
    return this.currentState === GameState.Puzzle1_MultiChoice ||
      this.currentState === GameState.Puzzle2_FillGap ||
      this.currentState === GameState.Puzzle3_Matching;
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

    if (this.isQuizActive) {
      this.currentBackgroundUrl = imagePaths.mateo_talking;
      return;
    }

    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }

    switch (this.currentView) {
      case 'plants': this.currentBackgroundUrl = imagePaths.zoom_plants; break;
      case 'laptop': this.currentBackgroundUrl = imagePaths.zoom_laptop; break;
      case 'floor': this.currentBackgroundUrl = imagePaths.zoom_floor; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  // --- Hint ---
  protected override onHintRequested(): void {
    this.isHintDialogue = true;
  }

  protected override getHintText(): string {
    if (this.currentState === GameState.Intro) return this.t('hints.intro');
    if (this.currentState === GameState.TalkToMateo1) return this.t('hints.talkToMateo1');
    if (this.currentState === GameState.FindPaper) return this.t('hints.findPaper');
    if (this.currentState === GameState.ReadPaper) return this.t('hints.readPaper');
    if (this.currentState === GameState.TalkToMateo2) return this.t('hints.talkToMateo2');
    if (this.currentState === GameState.ClickLaptop1 ||
        this.currentState === GameState.ClickLaptop2 ||
        this.currentState === GameState.ClickLaptop3 ||
        this.currentState === GameState.ClickLaptop4) return this.t('hints.clickLaptop');
    if (this.currentState === GameState.Puzzle1_MultiChoice) return this.t('puzzles.multiChoice.hint');
    if (this.currentState === GameState.Puzzle1Complete) return this.t('hints.puzzle1Complete');
    if (this.currentState === GameState.Conversation) return this.t('hints.conversation');
    if (this.currentState === GameState.Puzzle2_FillGap) return this.t('hints.puzzle2FillGap');
    if (this.currentState === GameState.Puzzle2Complete) return this.t('hints.puzzle2Complete');
    if (this.currentState === GameState.FindPendrive) return this.t('hints.findPendrive');
    if (this.currentState === GameState.Puzzle3_Matching) return this.t('hints.puzzle3Matching');
    if (this.currentState === GameState.ReadTextFile) return this.t('hints.readTextFile');
    if (this.currentState === GameState.TalkToZainabu) return this.t('hints.talkToZainabu');
    if (this.currentState === GameState.Reveal || this.currentState === GameState.Completion) return this.t('hints.completion');
    return this.t('hints.default');
  }

  // --- Hotspot clicks ---
  override onHotspotClick(target: string): void {
    this.showHints = false;
    if (this.activeDialogue) return;

    // Exit door
    if (target === 'exitDoor' && this.isDoorOpen && this.currentState === GameState.Completion) {
      this.playSound('success-chime.wav');
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
      return;
    }

    // Mateo interaction
    if (target === 'mateo') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.mateo_talking;
      this.handleMateoInteraction();
      return;
    }

    // Zainabu interaction
    if (target === 'zainabu') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.zainabu_talking;
      this.handleZainabuInteraction();
      return;
    }

    if (this.currentView === 'main') {
      // Plants area — only active during FindPaper
      if (target === 'plants' && this.currentState === GameState.FindPaper) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'plants';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on paper within zoomed view
        }, 2.5);
        return;
      }

      // Floor area — only active during FindPendrive
      if (target === 'floor' && this.currentState === GameState.FindPendrive) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'floor';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on pendrive within zoomed view
        }, 2.5);
        return;
      }

      // Laptop — active in ClickLaptop states
      if (target === 'laptop' && (
        this.currentState === GameState.ClickLaptop1 ||
        this.currentState === GameState.ClickLaptop2 ||
        this.currentState === GameState.ClickLaptop3 ||
        this.currentState === GameState.ClickLaptop4
      )) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'laptop';
          this.updateBackground();
          this.resetZoom(true);
          // Player must click hotspot within zoomed view to proceed
        }, 2.5);
        return;
      }

    }

    // --- Click within laptop zoomed view for ClickLaptop states ---
    if (this.currentView === 'laptop' && target === 'laptopContent') {
      if (this.currentState === GameState.ClickLaptop1) {
        this.playSound('paper-rustle.wav');
        this.currentState = GameState.Puzzle1_MultiChoice;
        this.updateBackground();
        return;
      } else if (this.currentState === GameState.ClickLaptop2) {
        this.playSound('paper-rustle.wav');
        this.currentState = GameState.Puzzle2_FillGap;
        this.updateBackground();
        return;
      } else if (this.currentState === GameState.ClickLaptop3) {
        this.playSound('paper-rustle.wav');
        this.isTextFileVisible = true;
        return;
      } else if (this.currentState === GameState.ClickLaptop4) {
        this.playSound('paper-rustle.wav');
        this.currentState = GameState.Puzzle3_Matching;
        this.updateBackground();
        return;
      }
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'plants' && target === 'paper' && this.currentState === GameState.FindPaper) {
      this.playSound('success-chime.wav');
      this.playSound('paper-rustle.wav');
      this.hasFoundPaper = true;
      this.isPaperVisible = true;
      return;
    }

    if (this.currentView === 'floor' && target === 'pendrive' && this.currentState === GameState.FindPendrive) {
      this.playSound('success-chime.wav');
      this.hasFoundPendrive = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundPendrive'), id: 'system_foundPendrive' });
      return;
    }
  }

  // --- Character Interactions ---

  handleMateoInteraction(): void {
    const state = this.currentState;
    const mateoName = this.t('characters.mateo.name');

    if (state === GameState.TalkToMateo1) {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateo.dialogues.greet'), id: 'mateo_greet' });
    }
    else if (state === GameState.TalkToMateo2) {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateo.dialogues.fastLearner'), id: 'mateo_fastLearner' });
    }
    else if (state === GameState.Puzzle1Complete) {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateo.dialogues.puzzle1Done'), id: 'mateo_puzzle1Done' });
    }
    else if (state === GameState.Completion) {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateo.dialogues.completion'), id: 'mateo_completion' });
    }
    else {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateo.dialogues.default'), id: 'mateo_default' });
    }
  }

  handleZainabuInteraction(): void {
    const state = this.currentState;
    const zainabuName = this.t('characters.zainabu.name');

    if (state === GameState.Puzzle2Complete) {
      this.showDialogue({ character: zainabuName, text: this.t('characters.zainabu.dialogues.pendriveTask'), id: 'zainabu_pendriveTask' });
    }
    else if (state === GameState.TalkToZainabu) {
      this.showDialogue({ character: zainabuName, text: this.t('characters.zainabu.dialogues.readyForFinal'), id: 'zainabu_readyForFinal' });
    }
    else if (state === GameState.Completion && this.isDoorOpen) {
      this.showDialogue({ character: zainabuName, text: this.t('characters.zainabu.dialogues.completion'), id: 'zainabu_completion' });
    }
    else {
      this.showDialogue({ character: zainabuName, text: this.t('characters.zainabu.dialogues.default'), id: 'zainabu_default' });
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

    const mateoName = this.t('characters.mateo.name');
    const zainabuName = this.t('characters.zainabu.name');

    // Reset view to main when not in zoom-dependent states
    if (this.currentView !== 'main' && !['system_foundPendrive'].includes(id || '')) {
      this.currentView = 'main';
    }

    // Intro → self talk → TalkToMateo1
    if (id === 'system_selfTalk') {
      this.currentState = GameState.TalkToMateo1;
    }
    // Mateo greets → gives clue
    else if (id === 'mateo_greet') {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateo.dialogues.clue'), id: 'mateo_clue' });
    }
    else if (id === 'mateo_clue') {
      this.currentState = GameState.FindPaper;
    }
    // Paper found → ReadPaper (popup closes via closePaper)
    else if (id === 'system_foundPaper') {
      // Paper popup will show
    }
    // Paper read → TalkToMateo2
    else if (id === 'system_paperRead') {
      this.currentState = GameState.TalkToMateo2;
    }
    // Mateo says fast learner → ClickLaptop1
    else if (id === 'mateo_fastLearner') {
      this.currentState = GameState.ClickLaptop1;
    }
    // Puzzle 1 complete
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    // Mateo puzzle1Done → gets interrupted
    else if (id === 'mateo_puzzle1Done') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.noticeCues'), id: 'system_noticeCues' });
    }
    // Notice cues → start conversation chain
    else if (id === 'system_noticeCues') {
      this.currentState = GameState.Conversation;
      this.showDialogue({ character: zainabuName, text: this.t('characters.zainabu.dialogues.conv1'), id: 'zainabu_conv1' });
    }
    // Conversation chain (10 dialogues)
    else if (id === 'zainabu_conv1') {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateoConv.dialogues.conv2'), id: 'mateo_conv2' });
    }
    else if (id === 'mateo_conv2') {
      this.showDialogue({ character: zainabuName, text: this.t('characters.zainabu.dialogues.conv3'), id: 'zainabu_conv3' });
    }
    else if (id === 'zainabu_conv3') {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateoConv.dialogues.conv4'), id: 'mateo_conv4' });
    }
    else if (id === 'mateo_conv4') {
      this.showDialogue({ character: zainabuName, text: this.t('characters.zainabu.dialogues.conv5'), id: 'zainabu_conv5' });
    }
    else if (id === 'zainabu_conv5') {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateoConv.dialogues.conv6'), id: 'mateo_conv6' });
    }
    else if (id === 'mateo_conv6') {
      this.showDialogue({ character: zainabuName, text: this.t('characters.zainabu.dialogues.conv7'), id: 'zainabu_conv7' });
    }
    else if (id === 'zainabu_conv7') {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateoConv.dialogues.conv8'), id: 'mateo_conv8' });
    }
    else if (id === 'mateo_conv8') {
      this.showDialogue({ character: zainabuName, text: this.t('characters.zainabu.dialogues.conv9'), id: 'zainabu_conv9' });
    }
    else if (id === 'zainabu_conv9') {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateoConv.dialogues.conv10'), id: 'mateo_conv10' });
    }
    // Conversation ends → Mateo says back to you → ClickLaptop2
    else if (id === 'mateo_conv10') {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateo.dialogues.backToYou'), id: 'mateo_backToYou' });
    }
    else if (id === 'mateo_backToYou') {
      this.currentState = GameState.ClickLaptop2;
    }
    // Puzzle 2 complete
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
    }
    // Zainabu pendrive task → FindPendrive
    else if (id === 'zainabu_pendriveTask') {
      this.currentState = GameState.FindPendrive;
    }
    // Pendrive found → ClickLaptop3
    else if (id === 'system_foundPendrive') {
      this.currentView = 'main';
      this.currentState = GameState.ClickLaptop3;
      this.updateBackground();
    }
    // Text file read → TalkToZainabu
    else if (id === 'system_textFileRead') {
      this.currentState = GameState.TalkToZainabu;
    }
    // Zainabu ready for final → ClickLaptop4
    else if (id === 'zainabu_readyForFinal') {
      this.currentState = GameState.ClickLaptop4;
    }
    // Puzzle 3 complete
    else if (id === 'system_puzzle3Complete') {
      // State already changed before dialogue was shown
      this.showDialogue({ character: zainabuName, text: this.t('characters.zainabu.dialogues.congratsFinal'), id: 'zainabu_congratsFinal' });
    }
    // Zainabu congrats → Mateo congrats
    else if (id === 'zainabu_congratsFinal') {
      this.showDialogue({ character: mateoName, text: this.t('characters.mateo.dialogues.congratsFinal'), id: 'mateo_congratsFinal' });
    }
    // Mateo congrats → door opens → Completion
    else if (id === 'mateo_congratsFinal') {
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.playDoorSound();
      this.updateBackground();
    }
  }

  handleDialogueDismiss(): void {
    this.dismissDialogue();
  }

  // --- Intro popup closed ---
  protected override onIntroPopupClosed(): void {
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.selfTalk'), id: 'system_selfTalk' });
  }

  // --- UI Helpers ---

  protected override resetZoomState(): void {
    this.currentView = 'main';
  }

  closePaper(): void {
    this.isPaperVisible = false;
    this.goBack();
    if (this.currentState === GameState.FindPaper) {
      this.currentState = GameState.ReadPaper;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.paperRead'), id: 'system_paperRead' });
    }
  }

  closeTextFile(): void {
    this.isTextFileVisible = false;
    this.goBack();
    if (this.currentState === GameState.ClickLaptop3) {
      this.currentState = GameState.ReadTextFile;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.textFileRead'), id: 'system_textFileRead' });
    }
  }

  togglePaper(): void {
    if (this.hasFoundPaper) {
      this.playSound('paper-rustle.wav');
      this.isPaperVisible = !this.isPaperVisible;
      this.isTextFileVisible = false;
    }
  }

  toggleTextFile(): void {
    if (this.hasFoundPendrive) {
      this.playSound('paper-rustle.wav');
      this.isTextFileVisible = !this.isTextFileVisible;
      this.isPaperVisible = false;
    }
  }

  // --- Puzzle 1: Multiple Choice (select 2) ---

  toggleMultiOption(id: string): void {
    const idx = this.selectedMultiOptions.indexOf(id);
    if (idx > -1) {
      this.selectedMultiOptions = this.selectedMultiOptions.filter(o => o !== id);
    } else if (this.selectedMultiOptions.length < 2) {
      this.selectedMultiOptions = [...this.selectedMultiOptions, id];
    }
    this.puzzleFeedback = '';
  }

  submitMultiChoice(): void {
    const correct = this.selectedMultiOptions.length === 2 &&
      this.selectedMultiOptions.includes('b') &&
      this.selectedMultiOptions.includes('d');

    if (correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.puzzle1WrongAttempts = 0;
      this.recordPuzzleScore('Multiple Choice', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
      setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Puzzle1Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.multiChoice.feedback.correct'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.puzzle1WrongAttempts++;
      this.puzzle1TotalWrong++;

      if (this.puzzle1WrongAttempts >= 3) {
        this.puzzle1WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.multiChoice.answerOverlay');
        this.answerOverlayCallback = () => {
          this.puzzle1WrongAttempts = 0;
          this.selectedMultiOptions = ['b', 'd'];
          this.recordPuzzleScore('Multiple Choice', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
          setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Puzzle1Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.multiChoice.feedback.correct'), id: 'system_puzzle1Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.multiChoice.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Puzzle 2: Fill-the-Gap (5 blanks) ---

  fillGap(word: string): void {
    this.fillGapSlot(this.userGapAnswers, word);
  }

  resetGap(): void {
    this.userGapAnswers = this.resetGapSlots(5) as string[];
  }

  submitGap(): void {
    const correct = [
      this.t('puzzles.fillGap.correctOrder.0'),
      this.t('puzzles.fillGap.correctOrder.1'),
      this.t('puzzles.fillGap.correctOrder.2'),
      this.t('puzzles.fillGap.correctOrder.3'),
      this.t('puzzles.fillGap.correctOrder.4')
    ];
    if (JSON.stringify(this.userGapAnswers) === JSON.stringify(correct)) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.gapWrongAttempts = 0;
      this.recordPuzzleScore('Fill the Gap', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
      setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Puzzle2Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.fillGap.feedback.correct'), id: 'system_puzzle2Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
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
          setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Puzzle2Complete;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.fillGap.feedback.correct'), id: 'system_puzzle2Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.fillGap.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Puzzle 3: Matching Logic ---

  selectCue(id: string): void {
    const result = this.selectMatchCue(id, this.solvedMatches);
    if (result !== null) this.selectedCueId = result;
  }

  // --- Skip Puzzle Methods ---

  skipPuzzle1(): void {
    this.recordPuzzleScore('Multiple Choice', 99, true);
    this.currentView = 'main';
    this.currentState = GameState.Puzzle1Complete;
    this.puzzleFeedback = '';
    this.updateBackground();
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Fill the Gap', 99, true);
    this.currentView = 'main';
    this.currentState = GameState.Puzzle2Complete;
    this.puzzleFeedback = '';
    this.updateBackground();
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Matching', 99, true);
    this.currentView = 'main';
    this.currentState = GameState.Reveal;
    this.puzzleFeedback = '';
    this.updateBackground();
    const zainabuName = this.t('characters.zainabu.name');
    this.showDialogue({ character: zainabuName, text: this.t('characters.zainabu.dialogues.congratsFinal'), id: 'zainabu_congratsFinal' });
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
        this.currentView = 'main';
        this.currentState = GameState.Reveal;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.allCorrect'), id: 'system_puzzle3Complete' });
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
          this.solvedMatches = ['1', '2', '3', '4', '5'];
          this.recordPuzzleScore('Matching', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
          setTimeout(() => {
        this.currentView = 'main';
        this.currentState = GameState.Reveal;
        this.updateBackground();
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.matching.feedback.revealedComplete'), id: 'system_puzzle3Complete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.matching.feedback.wrong');
      }
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }
}

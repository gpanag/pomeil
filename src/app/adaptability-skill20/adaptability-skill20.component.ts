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
  TalkToAnastasia,
  FindPoster,
  ReadPoster,
  TalkToAnastasia2,
  Puzzle1_MultiChoice,
  Puzzle1Complete,
  MoveToFloor2,
  TalkToAmina,
  FindTabletIcon,
  ReadTextFile,
  TalkToAmina2,
  ClickTablet,
  Puzzle2_FillGap,
  Puzzle2Complete,
  MoveToFloor3,
  TalkToWei,
  FindStickyNote,
  ReadStickyNote,
  TalkToWei2,
  Puzzle3_SequenceOrder,
  Reveal,
  Completion
}

const imagePaths = {
  base: '/assets/images/adaptability/staircase.png',
  base_door_open: '/assets/images/adaptability/staircase_door_open.png',
  floor1: '/assets/images/adaptability/floor1.png',
  floor2: '/assets/images/adaptability/floor2.png',
  floor3: '/assets/images/adaptability/floor3.png',
  anastasia_hover: '/assets/images/adaptability/anastasia_hover.png',
  anastasia_talking: '/assets/images/adaptability/anastasia_talking.png',
  amina_hover: '/assets/images/adaptability/amina_hover.png',
  amina_talking: '/assets/images/adaptability/amina_talking.png',
  wei_hover: '/assets/images/adaptability/wei_hover.png',
  wei_talking: '/assets/images/adaptability/wei_talking.png',
  wei_hover_door_open: '/assets/images/adaptability/wei_hover_door_open.png',
  zoom_wall: '/assets/images/adaptability/zoom_wall.png',
  zoom_tablet: '/assets/images/adaptability/zoom_tablet.png',
  zoom_wei: '/assets/images/adaptability/zoom_wei.png',
  poster: '/assets/images/adaptability/poster.png',
  tablet: '/assets/images/adaptability/tablet.png',
  sticky_note: '/assets/images/adaptability/sticky_note.png',
};

type ViewState = 'main' | 'wall' | 'tablet' | 'weiArea';
type FloorState = 'floor1' | 'floor2' | 'floor3';

const roomConfig: EscapeRoomConfig = {
  roomId: 'adaptability',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
  selector: 'app-adaptability-skill20',
  templateUrl: './adaptability-skill20.component.html',
  styleUrl: './adaptability-skill20.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule, DragDropModule],
  animations: [fadeInOut]
})
export class AdaptabilitySkill20Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;
  trackByKey = (_: number, item: { key: string }) => item.key;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'main';
  public currentFloor: FloorState = 'floor1';

  public isHintDialogue: boolean = false;

  // Floor transition
  isFloorTransitionVisible: boolean = false;
  floorTransitionText: string = '';

  // Item visibility
  isPosterVisible: boolean = false;
  isTextFileVisible: boolean = false;
  isStickyNoteVisible: boolean = false;

  // Item found flags
  hasFoundPoster: boolean = false;
  hasFoundTextFile: boolean = false;
  hasFoundStickyNote: boolean = false;

  hotspots = {
    main: {
      anastasia: { x: 63, y: 28, width: 13, height: 71 },
      amina: { x: 51, y: 15, width: 20, height: 84 },
      wei: { x: 54, y: 12, width: 17, height: 87 },
      wall: { x: 0, y: 17, width: 10, height: 23 },
      tablet: { x: 60, y: 35, width: 12, height: 25 },
      weiArea: { x: 48, y: 5, width: 20, height: 30 },
      exitDoor: { x: 45, y: 5, width: 15, height: 25 },
    },
    // Hotspots within zoomed views — player clicks these to find items
    wall_zoom: {
      poster: { x: 57, y: 38, width: 18, height: 25 },
    },
    tablet_zoom: {
      tabletIcon: { x: 54, y: 19, width: 5, height: 6 },
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    weiArea_zoom: {
      stickyNote: { x: 89, y: 8, width: 6, height: 21 },
    }
  };

  // --- Puzzle 1: Multiple Choice (2 correct out of 4) ---
  get multiChoiceOptions() {
    return [
      { id: 'a', text: this.t('puzzles.multiChoice.options.a'), correct: true },
      { id: 'b', text: this.t('puzzles.multiChoice.options.b'), correct: false },
      { id: 'c', text: this.t('puzzles.multiChoice.options.c'), correct: true },
      { id: 'd', text: this.t('puzzles.multiChoice.options.d'), correct: false }
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

  // --- Puzzle 3: Sequence Ordering (6 items, REVERSED) ---
  userSequence: string[] = [];
  puzzle3WrongAttempts: number = 0;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  override get characterImages(): CharacterImageMap {
    if (this.currentFloor === 'floor1') {
      return { anastasia: { hover: imagePaths.anastasia_hover, hoverDoorOpen: imagePaths.anastasia_hover } };
    } else if (this.currentFloor === 'floor2') {
      return { amina: { hover: imagePaths.amina_hover, hoverDoorOpen: imagePaths.amina_hover } };
    } else {
      return { wei: { hover: imagePaths.wei_hover, hoverDoorOpen: imagePaths.wei_hover_door_open } };
    }
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
      this.currentState === GameState.Puzzle3_SequenceOrder;
  }

  constructor(
    @Inject(DOCUMENT) document: Document,
    router: Router,
    dialog: MatDialog,
    textService: EscapeRoomTextService
  ) {
    super(document, router, dialog, textService);
    this.currentBackgroundUrl = imagePaths.floor1;
  }

  protected override onInit(): void {
    this.preloadImages(Object.values(imagePaths));
    this.initSequenceOrder();
  }

  initSequenceOrder(): void {
    // Shuffle items for the ordering puzzle
    const items = [
      this.t('puzzles.sequenceOrder.items.0'),
      this.t('puzzles.sequenceOrder.items.1'),
      this.t('puzzles.sequenceOrder.items.2'),
      this.t('puzzles.sequenceOrder.items.3'),
      this.t('puzzles.sequenceOrder.items.4'),
      this.t('puzzles.sequenceOrder.items.5')
    ].filter(i => i);
    // Shuffle
    this.userSequence = [...items].sort(() => Math.random() - 0.5);
  }

  // --- Background ---
  override updateBackground(): void {
    if (this.activeDialogue) return;

    if (this.isQuizActive) {
      if (this.currentFloor === 'floor1') this.currentBackgroundUrl = imagePaths.anastasia_talking;
      else if (this.currentFloor === 'floor2') this.currentBackgroundUrl = imagePaths.amina_talking;
      else this.currentBackgroundUrl = imagePaths.wei_talking;
      return;
    }

    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }

    switch (this.currentView) {
      case 'wall': this.currentBackgroundUrl = imagePaths.zoom_wall; break;
      case 'tablet': this.currentBackgroundUrl = imagePaths.zoom_tablet; break;
      case 'weiArea': this.currentBackgroundUrl = imagePaths.zoom_wei; break;
      default:
        // Show the correct floor image based on current floor
        if (this.currentFloor === 'floor1') this.currentBackgroundUrl = imagePaths.floor1;
        else if (this.currentFloor === 'floor2') this.currentBackgroundUrl = imagePaths.floor2;
        else this.currentBackgroundUrl = imagePaths.floor3;
        break;
    }
  }

  // --- Hint ---
  protected override onHintRequested(): void {
    this.isHintDialogue = true;
  }

  protected override getHintText(): string {
    if (this.currentState === GameState.Intro) return this.t('hints.intro');
    if (this.currentState === GameState.TalkToAnastasia) return this.t('hints.talkToAnastasia');
    if (this.currentState === GameState.FindPoster) return this.t('hints.findPoster');
    if (this.currentState === GameState.ReadPoster) return this.t('hints.readPoster');
    if (this.currentState === GameState.TalkToAnastasia2) return this.t('hints.talkToAnastasia2');
    if (this.currentState === GameState.MoveToFloor2 || this.currentState === GameState.TalkToAmina) return this.t('hints.talkToAmina');
    if (this.currentState === GameState.FindTabletIcon) return this.t('hints.findTabletIcon');
    if (this.currentState === GameState.ReadTextFile) return this.t('hints.readTextFile');
    if (this.currentState === GameState.TalkToAmina2) return this.t('hints.talkToAmina2');
    if (this.currentState === GameState.ClickTablet) return this.t('hints.clickTablet');
    if (this.currentState === GameState.MoveToFloor3 || this.currentState === GameState.TalkToWei) return this.t('hints.talkToWei');
    if (this.currentState === GameState.FindStickyNote) return this.t('hints.findStickyNote');
    if (this.currentState === GameState.ReadStickyNote) return this.t('hints.readStickyNote');
    if (this.currentState === GameState.TalkToWei2) return this.t('hints.talkToWei2');
    if (this.currentState === GameState.Puzzle1_MultiChoice) return this.t('puzzles.multiChoice.hint');
    if (this.currentState === GameState.Puzzle2_FillGap) return this.t('hints.puzzle2FillGap');
    if (this.currentState === GameState.Puzzle3_SequenceOrder) return this.t('puzzles.sequenceOrder.hint');
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

    // Character interactions
    if (target === 'anastasia' && this.currentFloor === 'floor1') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.anastasia_talking;
      this.handleAnastasiaInteraction();
      return;
    }
    if (target === 'amina' && this.currentFloor === 'floor2') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.amina_talking;
      this.handleAminaInteraction();
      return;
    }
    if (target === 'wei' && this.currentFloor === 'floor3') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.wei_talking;
      this.handleWeiInteraction();
      return;
    }

    if (this.currentView === 'main') {
      // Wall poster — only during FindPoster (zoom in, player must click poster within zoomed view)
      if (target === 'wall' && this.currentState === GameState.FindPoster) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'wall';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on poster within zoomed view
        }, 2.5);
        return;
      }

      // Tablet — during FindTabletIcon, ReadTextFile, ClickTablet
      if (target === 'tablet' && (
        this.currentState === GameState.FindTabletIcon ||
        this.currentState === GameState.ReadTextFile ||
        this.currentState === GameState.ClickTablet
      )) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'tablet';
          this.updateBackground();
          this.resetZoom(true);
          // Player must click hotspot within zoomed view to proceed
        }, 2.5);
        return;
      }

      // Wei area — during FindStickyNote (zoom in, player must click sticky note within zoomed view)
      if (target === 'weiArea' && this.currentState === GameState.FindStickyNote) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'weiArea';
          this.updateBackground();
          this.resetZoom(true);
          // Don't auto-give item — player must click on sticky note within zoomed view
        }, 2.5);
        return;
      }
    }

    // --- Click within tablet zoomed view for ReadTextFile / ClickTablet states ---
    if (this.currentView === 'tablet' && target === 'tabletContent') {
      if (this.currentState === GameState.ReadTextFile) {
        this.playSound('paper-rustle.wav');
        this.isTextFileVisible = true;
        return;
      } else if (this.currentState === GameState.ClickTablet) {
        this.playSound('paper-rustle.wav');
        this.currentState = GameState.Puzzle2_FillGap;
        this.updateBackground();
        return;
      }
    }

    // --- Clicks within zoomed views (find items) ---
    if (this.currentView === 'wall' && target === 'poster' && this.currentState === GameState.FindPoster) {
      this.playSound('success-chime.wav');
      this.hasFoundPoster = true;
      this.isPosterVisible = true;
      return;
    }

    if (this.currentView === 'tablet' && target === 'tabletIcon' && this.currentState === GameState.FindTabletIcon) {
      this.playSound('success-chime.wav');
      this.hasFoundTextFile = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundTabletIcon'), id: 'system_foundTabletIcon' });
      return;
    }

    if (this.currentView === 'weiArea' && target === 'stickyNote' && this.currentState === GameState.FindStickyNote) {
      this.playSound('success-chime.wav');
      this.hasFoundStickyNote = true;
      this.isStickyNoteVisible = true;
      return;
    }
  }

  // --- Character Interactions ---

  handleAnastasiaInteraction(): void {
    const name = this.t('characters.anastasia.name');
    if (this.currentState === GameState.TalkToAnastasia) {
      this.showDialogue({ character: name, text: this.t('characters.anastasia.dialogues.greet'), id: 'anastasia_greet' });
    } else if (this.currentState === GameState.TalkToAnastasia2) {
      this.showDialogue({ character: name, text: this.t('characters.anastasia.dialogues.puzzle1Intro'), id: 'anastasia_puzzle1Intro' });
    } else if (this.currentState === GameState.Puzzle1Complete) {
      this.showDialogue({ character: name, text: this.t('characters.anastasia.dialogues.puzzle1Done'), id: 'anastasia_puzzle1Done' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.anastasia.dialogues.default'), id: 'anastasia_default' });
    }
  }

  handleAminaInteraction(): void {
    const name = this.t('characters.amina.name');
    if (this.currentState === GameState.TalkToAmina) {
      this.showDialogue({ character: name, text: this.t('characters.amina.dialogues.greet'), id: 'amina_greet' });
    } else if (this.currentState === GameState.TalkToAmina2) {
      this.showDialogue({ character: name, text: this.t('characters.amina.dialogues.puzzle2Intro'), id: 'amina_puzzle2Intro' });
    } else if (this.currentState === GameState.Puzzle2Complete) {
      this.showDialogue({ character: name, text: this.t('characters.amina.dialogues.puzzle2Done'), id: 'amina_puzzle2Done' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.amina.dialogues.default'), id: 'amina_default' });
    }
  }

  handleWeiInteraction(): void {
    const name = this.t('characters.wei.name');
    if (this.currentState === GameState.TalkToWei) {
      this.showDialogue({ character: name, text: this.t('characters.wei.dialogues.greet'), id: 'wei_greet' });
    } else if (this.currentState === GameState.TalkToWei2) {
      this.showDialogue({ character: name, text: this.t('characters.wei.dialogues.puzzle3Intro'), id: 'wei_puzzle3Intro' });
    } else if (this.currentState === GameState.Completion) {
      this.showDialogue({ character: name, text: this.t('characters.wei.dialogues.completion'), id: 'wei_completion' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.wei.dialogues.default'), id: 'wei_default' });
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

    if (this.currentView !== 'main' && !['system_foundTabletIcon'].includes(id || '')) {
      this.currentView = 'main';
    }

    // Intro → self talk → TalkToAnastasia
    if (id === 'system_selfTalk') {
      this.currentState = GameState.TalkToAnastasia;
    }
    // Anastasia greets → FindPoster
    else if (id === 'anastasia_greet') {
      this.currentState = GameState.FindPoster;
    }
    // Poster read → TalkToAnastasia2
    else if (id === 'system_posterRead') {
      this.currentState = GameState.TalkToAnastasia2;
    }
    // Anastasia puzzle1 intro → Puzzle1
    else if (id === 'anastasia_puzzle1Intro') {
      this.currentState = GameState.Puzzle1_MultiChoice;
      this.updateBackground();
    }
    // Puzzle 1 complete
    else if (id === 'system_puzzle1Complete') {
      // State already changed before dialogue was shown
    }
    // Anastasia puzzle1Done → show floor transition to floor 2
    else if (id === 'anastasia_puzzle1Done') {
      this.currentState = GameState.MoveToFloor2;
      this.floorTransitionText = this.t('floorTransition.toFloor2') || 'Moving to the next floor...';
      this.isFloorTransitionVisible = true;
    }
    // Amina greets → FindTabletIcon
    else if (id === 'amina_greet') {
      this.currentState = GameState.FindTabletIcon;
    }
    // Found tablet icon → Amina says read file
    else if (id === 'system_foundTabletIcon') {
      this.currentView = 'main';
      const name = this.t('characters.amina.name');
      this.showDialogue({ character: name, text: this.t('characters.amina.dialogues.readFile'), id: 'amina_readFile' });
    }
    // Amina read file → ReadTextFile
    else if (id === 'amina_readFile') {
      this.currentState = GameState.ReadTextFile;
    }
    // Text file read → TalkToAmina2
    else if (id === 'system_textFileRead') {
      this.currentState = GameState.TalkToAmina2;
    }
    // Amina puzzle2 intro → ClickTablet
    else if (id === 'amina_puzzle2Intro') {
      this.currentState = GameState.ClickTablet;
    }
    // Puzzle 2 complete
    else if (id === 'system_puzzle2Complete') {
      // State already changed before dialogue was shown
    }
    // Amina puzzle2Done → show floor transition to floor 3
    else if (id === 'amina_puzzle2Done') {
      this.currentState = GameState.MoveToFloor3;
      this.floorTransitionText = this.t('floorTransition.toFloor3') || 'Moving to the next floor...';
      this.isFloorTransitionVisible = true;
    }
    // Wei greets → FindStickyNote
    else if (id === 'wei_greet') {
      this.currentState = GameState.FindStickyNote;
    }
    // Sticky note read → TalkToWei2
    else if (id === 'system_stickyNoteRead') {
      this.currentState = GameState.TalkToWei2;
    }
    // Wei puzzle3 intro → Puzzle3
    else if (id === 'wei_puzzle3Intro') {
      this.currentState = GameState.Puzzle3_SequenceOrder;
      this.initSequenceOrder();
      this.updateBackground();
    }
    // Puzzle 3 complete → Wei congratulates
    else if (id === 'system_puzzle3Complete') {
      // State already changed before dialogue was shown
      const weiName = this.t('characters.wei.name');
      this.showDialogue({ character: weiName, text: this.t('characters.wei.dialogues.puzzle3Done'), id: 'wei_puzzle3Done' });
    }
    // Wei final → door opens → Completion
    else if (id === 'wei_puzzle3Done') {
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.playDoorSound();
      this.updateBackground();
    }
  }

  handleDialogueDismiss(): void {
    this.dismissDialogue();
  }

  continueFloorTransition(): void {
    this.isFloorTransitionVisible = false;
    this.playSound('step.wav');
    if (this.currentState === GameState.MoveToFloor2) {
      this.currentFloor = 'floor2';
      this.currentState = GameState.TalkToAmina;
    } else if (this.currentState === GameState.MoveToFloor3) {
      this.currentFloor = 'floor3';
      this.currentState = GameState.TalkToWei;
    }
    this.updateBackground();
  }

  protected override onIntroPopupClosed(): void {
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.selfTalk'), id: 'system_selfTalk' });
  }

  protected override resetZoomState(): void {
    this.currentView = 'main';
  }

  // --- Item popup methods ---

  closePoster(): void {
    this.isPosterVisible = false;
    this.goBack();
    if (this.currentState === GameState.FindPoster) {
      this.currentState = GameState.ReadPoster;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.posterRead'), id: 'system_posterRead' });
    }
  }

  closeTextFile(): void {
    this.isTextFileVisible = false;
    this.goBack();
    if (this.currentState === GameState.ReadTextFile) {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.textFileRead'), id: 'system_textFileRead' });
    }
  }

  closeStickyNote(): void {
    this.isStickyNoteVisible = false;
    this.goBack();
    if (this.currentState === GameState.FindStickyNote) {
      this.currentState = GameState.ReadStickyNote;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.foundStickyNote'), id: 'system_stickyNoteRead' });
    }
  }

  togglePoster(): void {
    if (this.hasFoundPoster) {
      this.playSound('paper-rustle.wav');
      this.isPosterVisible = !this.isPosterVisible;
      this.isTextFileVisible = false;
      this.isStickyNoteVisible = false;
    }
  }

  toggleTextFile(): void {
    if (this.hasFoundTextFile) {
      this.playSound('paper-rustle.wav');
      this.isTextFileVisible = !this.isTextFileVisible;
      this.isPosterVisible = false;
      this.isStickyNoteVisible = false;
    }
  }

  toggleStickyNote(): void {
    if (this.hasFoundStickyNote) {
      this.playSound('paper-rustle.wav');
      this.isStickyNoteVisible = !this.isStickyNoteVisible;
      this.isPosterVisible = false;
      this.isTextFileVisible = false;
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
      this.selectedMultiOptions.includes('a') &&
      this.selectedMultiOptions.includes('c');

    if (correct) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.recordPuzzleScore('Multiple Choice', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
      setTimeout(() => {
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
          this.selectedMultiOptions = ['a', 'c'];
          this.recordPuzzleScore('Multiple Choice', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
          setTimeout(() => {
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

  // --- Puzzle 2: Fill-the-Gap ---

  fillGap(word: string): void {
    this.fillGapSlot(this.userGapAnswers, word);
  }

  resetGap(): void {
    this.userGapAnswers = this.resetGapSlots(5) as string[];
  }

  submitGap(): void {
    const correct = ['delay', 'unstable', 'consequences', 'experimentation', 'judgment'];
    if (JSON.stringify(this.userGapAnswers) === JSON.stringify(correct)) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
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

  // --- Skip Puzzle Methods ---

  skipPuzzle1(): void {
    this.recordPuzzleScore('Multiple Choice', 99, true);
    this.puzzleFeedback = '';
    this.selectedMultiOptions = [];
    this.currentState = GameState.Puzzle1Complete;
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.multiChoice.feedback.correct'), id: 'system_puzzle1Complete' });
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Fill the Gap', 99, true);
    this.puzzleFeedback = '';
    this.userGapAnswers = [null!, null!, null!, null!, null!];
    this.currentView = 'main';
    this.currentState = GameState.Puzzle2Complete;
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.fillGap.feedback.correct'), id: 'system_puzzle2Complete' });
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Sequence Order', 99, true);
    this.puzzleFeedback = '';
    this.currentView = 'main';
    this.currentState = GameState.Reveal;
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.sequenceOrder.feedback.correct'), id: 'system_puzzle3Complete' });
  }

  // --- Puzzle 3: Sequence Ordering (drag-drop, REVERSED) ---

  onDrop(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.userSequence, event.previousIndex, event.currentIndex);
  }

  submitSequence(): void {
    const correct = [
      this.t('puzzles.sequenceOrder.correctOrder.0'),
      this.t('puzzles.sequenceOrder.correctOrder.1'),
      this.t('puzzles.sequenceOrder.correctOrder.2'),
      this.t('puzzles.sequenceOrder.correctOrder.3'),
      this.t('puzzles.sequenceOrder.correctOrder.4'),
      this.t('puzzles.sequenceOrder.correctOrder.5')
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

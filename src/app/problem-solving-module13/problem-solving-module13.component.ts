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
import { EscapeRoomConfig, ESCAPE_ROOM_TIMING, CharacterImageMap } from '../shared/escape-room/escape-room.interfaces';

import { RoomHelpButtonComponent } from '../shared/escape-room/room-help-button/room-help-button.component';
enum GameState {
  Intro,
  ReadStickyNote,
  StickyNoteOpen,
  CleanRoomIntro,
  CleanRoom,
  CleanRoomDone,
  WaitForKnut,
  KnutArrived,
  KnutConversation,
  InvestigateIntro,
  InvestigatePhase1,
  InvestigatePhase2,
  InvestigatePhase3,
  InvestigatePhase4,
  DefineProblem,
  DefineProblemExplained,
  Completion,
  DoorOpen
}

type ViewState =
  | 'main'
  | 'stickyNote'
  | 'vent'
  | 'chewedBox'
  | 'brokenBox'
  | 'halfOpenDoor'
  | 'emptyShelf'
  | 'checklist'
  | 'deliveryNotes'
  | 'tablesBox'
  | 'chargersBox'
  | 'pansBox'
  | 'marketsBox'
  | 'labelPrinter';

const imagePaths = {
  baseMessy: '/assets/images/problem_solving/storage_room.png',
  baseKnut: '/assets/images/problem_solving/storage_room_knut.png',
  baseDoorOpen: '/assets/images/problem_solving/storage_room_door_open.png',
  knutHover: '/assets/images/problem_solving/knut_hover.png',
  knutHoverDoorOpen: '/assets/images/problem_solving/storage_room_door_open.png',
  knutTalking: '/assets/images/problem_solving/knut_talking.png',

  zoomStickyNote: '/assets/images/problem_solving/zoom_sticky_note.png',
  zoomVent: '/assets/images/problem_solving/zoom_vent.png',
  zoomVentOpen: '/assets/images/problem_solving/zoom_vent_open.png',
  zoomChewedBox: '/assets/images/problem_solving/zoom_chewed_box.png',
  zoomBrokenBox: '/assets/images/problem_solving/zoom_broken_box.png',
  zoomHalfOpenDoor: '/assets/images/problem_solving/zoom_half_open_door.png',
  zoomEmptyShelf: '/assets/images/problem_solving/zoom_empty_shelf.png',
  zoomChecklist: '/assets/images/problem_solving/zoom_checklist.png',
  zoomDeliveryNotes: '/assets/images/problem_solving/zoom_delivery_notes.png',
  zoomTablesBox: '/assets/images/problem_solving/zoom_tables_box.png',
  zoomTablesBoxOpen: '/assets/images/problem_solving/zoom_tables_box_open.png',
  zoomChargersBox: '/assets/images/problem_solving/zoom_chargers_box.png',
  zoomChargersBoxOpen: '/assets/images/problem_solving/zoom_chargers_box_open.png',
  zoomPansBox: '/assets/images/problem_solving/zoom_pans_box.png',
  zoomPansBoxOpen: '/assets/images/problem_solving/zoom_pans_box_open.png',
  zoomMarketsBox: '/assets/images/problem_solving/zoom_markets_box.png',
  zoomMarketsBoxPeeled: '/assets/images/problem_solving/zoom_markets_box_peeled.png',
  zoomLabelPrinter: '/assets/images/problem_solving/zoom_label_printer.png',
};

const roomConfig: EscapeRoomConfig = {
  roomId: 'problem-solving',
  typewriterSpeed: 25,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: true,
  imageWidth: 1584,
  imageHeight: 1056,
};

interface CleanableItem {
  id: string;
  kind: 'box' | 'trash';
  cleaned: boolean;
  hotspot: { x: number; y: number; width: number; height: number };
}

interface ConversationStep {
  id: string;
  npcText: string;
  replyText: string;
}

interface DefineOption {
  id: string;
  text: string;
  correct: boolean;
}

@Component({
    selector: 'app-problem-solving-module13',
    templateUrl: './problem-solving-module13.component.html',
    styleUrl: './problem-solving-module13.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class ProblemSolvingModule13Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;
  trackByKey = (_: number, item: { key: string }) => item.key;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'main';

  public isHintDialogue: boolean = false;

  // ── Character images (only Knut has hover variant) ──
  override get characterImages(): CharacterImageMap {
    return {
      knut: { hover: imagePaths.knutHover, hoverDoorOpen: imagePaths.knutHoverDoorOpen }
    };
  }

  // ── Hotspots ──
  hotspots = {
    // Corrected per VLM grounding audit 2026-04-24
    main: {
      stickyNote:   { x: 50, y: 38, width: 5,  height: 8  },
      chewedBox:    { x: 0,  y: 30, width: 13, height: 18 },
      brokenBox:    { x: 82, y: 72, width: 16, height: 22 },
      vent:         { x: 24, y: 50, width: 12, height: 19 },
      halfOpenDoor: { x: 40, y: 15, width: 16, height: 55 },
      emptyShelf:   { x: 76, y: 54, width: 22, height: 26 },
      checklist:    { x: 58, y: 31, width: 10, height: 13 },
      deliveryNotes:{ x: 62, y: 42, width: 10, height: 5  },
      labelPrinter: { x: 60, y: 44, width: 11, height: 11 },
      tablesBox:    { x: 0,  y: 4,  width: 14, height: 25 },
      chargersBox:  { x: 78, y: 15, width: 16, height: 18 },
      pansBox:      { x: 77, y: 34, width: 13, height: 20 },
      marketsBox:   { x: 88, y: 32, width: 11, height: 24 },
      knut:         { x: 30, y: 15, width: 26, height: 70 },
      exitDoor:     { x: 40, y: 15, width: 20, height: 55 },
    },
    sticky_zoom: {
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    vent_zoom: {
      cover: { x: 30, y: 40, width: 40, height: 30 },
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    box_zoom: {
      box: { x: 25, y: 25, width: 50, height: 50 },
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    markets_zoom: {
      label: { x: 30, y: 30, width: 40, height: 20 },
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    door_zoom: {
      door: { x: 25, y: 20, width: 50, height: 60 },
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    generic_zoom: {
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
  };

  // ── Puzzle 2: Clean the room ──
  // Positions are floor-level clutter in the base image (per VLM grounding)
  public cleanableItems: CleanableItem[] = [
    { id: 'box1',   kind: 'box',   cleaned: false, hotspot: { x: 49, y: 74, width: 14, height: 15 } },
    { id: 'box2',   kind: 'box',   cleaned: false, hotspot: { x: 51, y: 64, width: 12, height: 13 } },
    { id: 'trash1', kind: 'trash', cleaned: false, hotspot: { x: 61, y: 65, width: 16, height: 26 } },
    { id: 'trash2', kind: 'trash', cleaned: false, hotspot: { x: 0,  y: 76, width: 9,  height: 18 } },
    { id: 'trash3', kind: 'trash', cleaned: false, hotspot: { x: 56, y: 83, width: 9,  height: 10 } },
  ];

  get cleanedCount(): number {
    return this.cleanableItems.filter(i => i.cleaned).length;
  }
  get allCleaned(): boolean {
    return this.cleanableItems.every(i => i.cleaned);
  }

  // ── Puzzle 3: Knut conversation ──
  public conversationSteps: ConversationStep[] = [
    { id: 'step1', npcText: '', replyText: '' },
    { id: 'step2', npcText: '', replyText: '' },
    { id: 'step3', npcText: '', replyText: '' },
    { id: 'step4', npcText: '', replyText: '' },
    { id: 'step5', npcText: '', replyText: '' },
    { id: 'step6', npcText: '', replyText: '' },
  ];
  public conversationIndex: number = 0;
  public conversationShowReply: boolean = false;

  // ── Puzzle 4: Investigate ──
  public investigatePhase: 1 | 2 | 3 | 4 = 1;
  public investigatedObjects: Set<string> = new Set();

  private phase1Objects = ['chewedBox', 'vent', 'halfOpenDoor', 'emptyShelf', 'brokenBox'];
  private phase2Objects = ['checklist', 'deliveryNotes'];
  private phase3Objects = ['tablesBox', 'chargersBox', 'pansBox'];
  private phase4Objects = ['labelPrinter', 'marketsBox'];

  // Per-zoom state changes
  public isVentOpen: boolean = false;
  public isTablesBoxOpen: boolean = false;
  public isChargersBoxOpen: boolean = false;
  public isPansBoxOpen: boolean = false;
  public isMarketsBoxPeeled: boolean = false;
  public isHalfOpenDoorClosed: boolean = false;

  // ── Puzzle 5: Define the problem ──
  public defineOptions: DefineOption[] = [];
  public eliminatedDefineOptions: Set<string> = new Set();
  public selectedDefineOption: string | null = null;
  public defineAnswerCorrect: boolean = false;

  // ── Scoring counters ──
  public puzzle2TotalWrong: number = 0;
  public puzzle4TotalWrong: number = 0;
  public puzzle5TotalWrong: number = 0;

  constructor(
    @Inject(DOCUMENT) document: Document,
    router: Router,
    dialog: MatDialog,
    textService: EscapeRoomTextService
  ) {
    super(document, router, dialog, textService);
  }

  protected override onInit(): void {
    this.preloadImages([
      imagePaths.baseMessy,
      imagePaths.baseKnut,
      imagePaths.baseDoorOpen,
      imagePaths.knutHover,
      imagePaths.knutHoverDoorOpen,
      imagePaths.knutTalking,
    ]).then(() => {
      this.updateBackground();
    });

    // Load conversation text once i18n loads
    const initInterval = setInterval(() => {
      if (Object.keys(this.texts).length > 0) {
        this.loadConversationTexts();
        this.loadDefineOptions();
        clearInterval(initInterval);
      }
    }, 100);
  }

  private loadConversationTexts(): void {
    for (let i = 0; i < this.conversationSteps.length; i++) {
      const step = this.conversationSteps[i];
      step.npcText = this.t(`characters.knut.dialogues.${step.id}`);
      step.replyText = this.t(`userReplies.${step.id}`);
    }
  }

  private loadDefineOptions(): void {
    // Build define options array from i18n
    const optionsData: DefineOption[] = [
      { id: 'mess', text: this.t('puzzles.defineProblem.options.0.text'), correct: false },
      { id: 'theft', text: this.t('puzzles.defineProblem.options.1.text'), correct: false },
      { id: 'labels', text: this.t('puzzles.defineProblem.options.2.text'), correct: true },
      { id: 'delivery', text: this.t('puzzles.defineProblem.options.3.text'), correct: false },
      { id: 'mouse', text: this.t('puzzles.defineProblem.options.4.text'), correct: false },
    ];
    this.defineOptions = optionsData;
  }

  // ── Abstract implementations ──
  override get isMainViewActive(): boolean { return this.currentView === 'main'; }
  override get isQuizActive(): boolean {
    // Only overlay-based puzzles blur the scene. Hotspot-on-scene puzzles
    // (CleanRoom, Investigation phases, Knut conversation) must keep the
    // scene sharp so the player can see what to click.
    return this.currentState === GameState.DefineProblem ||
           this.currentState === GameState.DefineProblemExplained;
  }

  override updateBackground(): void {
    const v = this.currentView;
    if (v !== 'main') {
      this.currentBackgroundUrl = this.zoomImageFor(v);
      return;
    }
    if (this.currentState === GameState.DoorOpen || this.currentState === GameState.Completion) {
      this.currentBackgroundUrl = imagePaths.baseDoorOpen;
    } else if (this.hasKnutArrived()) {
      this.currentBackgroundUrl = imagePaths.baseKnut;
    } else {
      this.currentBackgroundUrl = imagePaths.baseMessy;
    }
  }

  private zoomImageFor(view: ViewState): string {
    switch (view) {
      case 'stickyNote': return imagePaths.zoomStickyNote;
      case 'vent': return this.isVentOpen ? imagePaths.zoomVentOpen : imagePaths.zoomVent;
      case 'chewedBox': return imagePaths.zoomChewedBox;
      case 'brokenBox': return imagePaths.zoomBrokenBox;
      case 'halfOpenDoor': return imagePaths.zoomHalfOpenDoor;
      case 'emptyShelf': return imagePaths.zoomEmptyShelf;
      case 'checklist': return imagePaths.zoomChecklist;
      case 'deliveryNotes': return imagePaths.zoomDeliveryNotes;
      case 'tablesBox': return this.isTablesBoxOpen ? imagePaths.zoomTablesBoxOpen : imagePaths.zoomTablesBox;
      case 'chargersBox': return this.isChargersBoxOpen ? imagePaths.zoomChargersBoxOpen : imagePaths.zoomChargersBox;
      case 'pansBox': return this.isPansBoxOpen ? imagePaths.zoomPansBoxOpen : imagePaths.zoomPansBox;
      case 'marketsBox': return this.isMarketsBoxPeeled ? imagePaths.zoomMarketsBoxPeeled : imagePaths.zoomMarketsBox;
      case 'labelPrinter': return imagePaths.zoomLabelPrinter;
      default: return imagePaths.baseMessy;
    }
  }

  protected override resetZoomState(): void {
    this.currentView = 'main';
  }

  private hasKnutArrived(): boolean {
    return this.currentState === GameState.KnutArrived ||
           this.currentState === GameState.KnutConversation ||
           this.currentState === GameState.InvestigateIntro ||
           this.currentState === GameState.InvestigatePhase1 ||
           this.currentState === GameState.InvestigatePhase2 ||
           this.currentState === GameState.InvestigatePhase3 ||
           this.currentState === GameState.InvestigatePhase4 ||
           this.currentState === GameState.DefineProblem ||
           this.currentState === GameState.DefineProblemExplained ||
           this.currentState === GameState.Completion ||
           this.currentState === GameState.DoorOpen;
  }

  // ── Intro ──
  protected override onIntroPopupClosed(): void {
    this.currentState = GameState.ReadStickyNote;
    this.updateBackground();
  }

  // ── Hotspot routing ──
  override onHotspotClick(target: string): void {
    if (this.isAnimating) return;

    if (target === 'stickyNote' && this.currentState === GameState.ReadStickyNote) {
      this.openStickyNote();
      return;
    }

    if (this.currentState === GameState.CleanRoom) {
      const item = this.cleanableItems.find(i => i.id === target);
      if (item && !item.cleaned) {
        this.cleanOneItem(item);
        return;
      }
    }

    if (target === 'knut' && this.currentState === GameState.KnutArrived) {
      this.startKnutConversation();
      return;
    }

    if (this.isInvestigationActive()) {
      this.handleInvestigateClick(target);
      return;
    }

    if (target === 'exitDoor' && this.currentState === GameState.DoorOpen) {
      this.confirmExit();
      return;
    }
  }

  private isInvestigationActive(): boolean {
    return this.currentState === GameState.InvestigatePhase1 ||
           this.currentState === GameState.InvestigatePhase2 ||
           this.currentState === GameState.InvestigatePhase3 ||
           this.currentState === GameState.InvestigatePhase4;
  }

  // ── Puzzle 1: Sticky Note ──
  private openStickyNote(): void {
    this.zoomToLocation('stickyNote', this.hotspots.main, () => {
      this.currentView = 'stickyNote';
      this.currentState = GameState.StickyNoteOpen;
      this.updateBackground();
      this.showDialogue({ character: '', text: this.t('puzzles.stickyNote.letter'), id: 'sticky-letter' });
    });
  }

  // ── Puzzle 2: Clean the Room ──
  private cleanOneItem(item: CleanableItem): void {
    item.cleaned = true;
    if (item.kind === 'box') {
      this.playSound('step.wav');
    } else {
      this.playSound('paper-rustle.wav');
    }

    if (this.allCleaned) {
      // Finish cleaning puzzle
      this.recordPuzzleScore('clean_room', this.puzzle2TotalWrong, false);
      this.currentState = GameState.CleanRoomDone;
      this.updateBackground();
      setTimeout(() => {
        this.showDialogue({ character: '', text: this.t('puzzles.cleanRoom.completionThought'), id: 'clean-done' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }
  }

  // ── Puzzle 3: Knut Conversation ──
  private knutArriveTimeout: any;

  private scheduleKnutArrival(): void {
    // Knut appears a moment after cleaning dialogue is dismissed
    this.currentState = GameState.WaitForKnut;
    this.updateBackground();
    this.knutArriveTimeout = setTimeout(() => {
      this.currentState = GameState.KnutArrived;
      this.updateBackground();
      this.playSound('door-open.wav');
      this.showDialogue({ character: '', text: this.t('puzzles.knutConversation.startDialogue'), id: 'knut-arrival' });
    }, 900);
  }

  private startKnutConversation(): void {
    this.conversationIndex = 0;
    this.conversationShowReply = false;
    this.currentState = GameState.KnutConversation;
    this.updateBackground();
    this.showDialogue({
      character: 'Knut',
      text: this.conversationSteps[0].npcText,
      id: `knut-${this.conversationSteps[0].id}`
    });
  }

  public selectKnutReply(): void {
    // User clicked the highlighted reply; show user line, then advance to next NPC statement
    const step = this.conversationSteps[this.conversationIndex];
    this.showDialogue({ character: '', text: step.replyText, id: `reply-${step.id}` });
    this.conversationShowReply = true;
  }

  public advanceKnutConversation(): void {
    this.conversationShowReply = false;
    this.conversationIndex++;
    if (this.conversationIndex >= this.conversationSteps.length) {
      // Conversation complete
      this.recordPuzzleScore('knut_conversation', 0, false);
      this.activeDialogue = null;
      this.currentState = GameState.InvestigateIntro;
      this.updateBackground();
      setTimeout(() => {
        this.showDialogue({ character: '', text: this.t('puzzles.investigate.introThought'), id: 'investigate-intro' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      const next = this.conversationSteps[this.conversationIndex];
      this.showDialogue({ character: 'Knut', text: next.npcText, id: `knut-${next.id}` });
    }
  }

  // ── Puzzle 4: Investigate ──
  private handleInvestigateClick(target: string): void {
    const phaseObjects = this.currentPhaseObjects();
    if (!phaseObjects.includes(target)) return;
    if (this.investigatedObjects.has(target)) return;

    this.zoomToLocation(target, this.hotspots.main, () => {
      this.currentView = target as ViewState;
      this.applyPerObjectStateChange(target);
      this.updateBackground();
      const thoughtKey = this.objectThoughtKey(target);
      this.playObjectSound(target);
      this.showDialogue({ character: '', text: this.t(thoughtKey), id: `investigate-${target}` });
    });

    this.investigatedObjects.add(target);
  }

  private applyPerObjectStateChange(target: string): void {
    switch (target) {
      case 'vent': this.isVentOpen = true; break;
      case 'halfOpenDoor': this.isHalfOpenDoorClosed = true; break;
      case 'tablesBox': this.isTablesBoxOpen = true; break;
      case 'chargersBox': this.isChargersBoxOpen = true; break;
      case 'pansBox': this.isPansBoxOpen = true; break;
      case 'marketsBox': this.isMarketsBoxPeeled = true; break;
    }
  }

  private playObjectSound(target: string): void {
    switch (target) {
      case 'chewedBox':
      case 'vent':
        this.playSound('error-buzz.mp3'); // substitute mouse squeak
        break;
      case 'halfOpenDoor':
        this.playDoorSound();
        break;
      case 'brokenBox':
        this.playSound('paper-rustle.wav');
        break;
      case 'checklist':
      case 'deliveryNotes':
      case 'tablesBox':
      case 'chargersBox':
      case 'pansBox':
        this.playSound('paper-rustle.wav');
        break;
      case 'marketsBox':
        this.playSound('paper-rustle.wav');
        break;
      case 'labelPrinter':
        this.playSound('success-chime.wav');
        break;
      default:
        this.playSound('step.wav');
    }
  }

  private objectThoughtKey(target: string): string {
    const mapping: { [k: string]: string } = {
      chewedBox: 'puzzles.investigate.objects.chewedBox.thought',
      vent: 'puzzles.investigate.objects.vent.thought',
      halfOpenDoor: 'puzzles.investigate.objects.halfOpenDoor.thought',
      emptyShelf: 'puzzles.investigate.objects.emptyShelf.thought',
      brokenBox: 'puzzles.investigate.objects.brokenBox.thought',
      checklist: 'puzzles.investigate.objects.cleaningChecklist.thought',
      deliveryNotes: 'puzzles.investigate.objects.deliveryNotes.thought',
      tablesBox: 'puzzles.investigate.objects.tablesBox.thought',
      chargersBox: 'puzzles.investigate.objects.chargersBox.thought',
      pansBox: 'puzzles.investigate.objects.pansBox.thought',
      marketsBox: 'puzzles.investigate.objects.marketsBox.thought',
      labelPrinter: 'puzzles.investigate.objects.labelPrinter.thought',
    };
    return mapping[target] || 'hints.default';
  }

  private currentPhaseObjects(): string[] {
    switch (this.currentState) {
      case GameState.InvestigatePhase1: return this.phase1Objects;
      case GameState.InvestigatePhase2: return this.phase2Objects;
      case GameState.InvestigatePhase3: return this.phase3Objects;
      case GameState.InvestigatePhase4: return this.phase4Objects;
      default: return [];
    }
  }

  private phaseDone(phaseObjects: string[]): boolean {
    return phaseObjects.every(o => this.investigatedObjects.has(o));
  }

  private advanceInvestigationPhase(): void {
    if (this.currentState === GameState.InvestigatePhase1 && this.phaseDone(this.phase1Objects)) {
      this.currentState = GameState.InvestigatePhase2;
      this.showDialogue({ character: '', text: this.t('puzzles.investigate.phaseCompleteThoughts.phase1'), id: 'phase1-done' });
    } else if (this.currentState === GameState.InvestigatePhase2 && this.phaseDone(this.phase2Objects)) {
      this.currentState = GameState.InvestigatePhase3;
      this.showDialogue({ character: '', text: this.t('puzzles.investigate.phaseCompleteThoughts.phase2'), id: 'phase2-done' });
    } else if (this.currentState === GameState.InvestigatePhase3 && this.phaseDone(this.phase3Objects)) {
      this.currentState = GameState.InvestigatePhase4;
      this.showDialogue({ character: '', text: this.t('puzzles.investigate.phaseCompleteThoughts.phase3'), id: 'phase3-done' });
    } else if (this.currentState === GameState.InvestigatePhase4 && this.phaseDone(this.phase4Objects)) {
      // All phases done
      this.recordPuzzleScore('investigate', this.puzzle4TotalWrong, false);
      this.currentState = GameState.DefineProblem;
      this.showDialogue({ character: '', text: this.t('systemDialogues.investigateComplete'), id: 'investigate-complete' });
    }
  }

  public isHotspotPulsing(target: string): boolean {
    if (!this.showHints) return false;
    if (this.currentState === GameState.ReadStickyNote && target === 'stickyNote') return true;
    if (this.currentState === GameState.CleanRoom && this.cleanableItems.some(i => i.id === target && !i.cleaned)) return true;
    if (this.currentState === GameState.KnutArrived && target === 'knut') return true;
    if (this.isInvestigationActive()) {
      return this.currentPhaseObjects().includes(target) && !this.investigatedObjects.has(target);
    }
    if (this.currentState === GameState.DoorOpen && target === 'exitDoor') return true;
    return false;
  }

  // ── Visible investigate hotspots for template *ngFor ──
  get visibleInvestigateHotspots(): { key: string; rect: { x: number; y: number; width: number; height: number } }[] {
    if (!this.isInvestigationActive()) return [];
    const active = this.currentPhaseObjects();
    const rects = this.hotspots.main as { [k: string]: { x: number; y: number; width: number; height: number } };
    return active
      .filter(k => !this.investigatedObjects.has(k))
      .map(k => ({ key: k, rect: rects[k] }))
      .filter(h => !!h.rect);
  }

  // ── Puzzle 5: Define the Problem ──
  public selectDefineOption(optionId: string): void {
    if (this.eliminatedDefineOptions.has(optionId)) return;
    const opt = this.defineOptions.find(o => o.id === optionId);
    if (!opt) return;
    this.selectedDefineOption = optionId;
    if (opt.correct) {
      this.defineAnswerCorrect = true;
      this.recordPuzzleScore('define_problem', this.puzzle5TotalWrong, false);
      this.currentState = GameState.DefineProblemExplained;
      this.puzzleFeedback = this.t(`puzzles.defineProblem.tooltips.${optionId}`);
    } else {
      this.puzzle5TotalWrong++;
      this.eliminatedDefineOptions.add(optionId);
      this.playSound('error-buzz.mp3');
      this.puzzleFeedback = this.t(`puzzles.defineProblem.tooltips.${optionId}`);
      this.isPuzzleWrong = true;
      setTimeout(() => {
        this.isPuzzleWrong = false;
      }, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  public continueDefineProblem(): void {
    // Close the puzzle, finalize, and open the door
    this.finalizeAndReportScore();
    this.currentState = GameState.DoorOpen;
    this.isDoorOpen = true;
    this.updateBackground();
    this.playDoorSound();
    setTimeout(() => {
      this.isGameCompleteOverlayVisible = true;
    }, 1200);
  }

  // ── Dialogue dismissal (ID-based) ──
  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;

    // Sticky note letter → show follow-up thought
    if (id === 'sticky-letter') {
      this.activeDialogue = null;
      this.showDialogue({ character: '', text: this.t('puzzles.stickyNote.thought'), id: 'sticky-thought' });
      return;
    }
    if (id === 'sticky-thought') {
      this.activeDialogue = null;
      this.recordPuzzleScore('sticky_note', 0, false);
      // Zoom back out
      this.goBack();
      this.currentState = GameState.CleanRoomIntro;
      setTimeout(() => {
        this.showDialogue({ character: '', text: this.t('puzzles.cleanRoom.introThought'), id: 'clean-intro' });
      }, ESCAPE_ROOM_TIMING.zoomOutDelay + 100);
      return;
    }
    if (id === 'clean-intro') {
      this.activeDialogue = null;
      this.currentState = GameState.CleanRoom;
      this.showHintPulse();
      return;
    }
    if (id === 'clean-done') {
      this.activeDialogue = null;
      this.scheduleKnutArrival();
      return;
    }
    if (id === 'knut-arrival') {
      this.activeDialogue = null;
      this.showHintPulse();
      return;
    }
    if (id && id.startsWith('knut-')) {
      // After NPC statement, show reply button (don't dismiss to reply, user clicks reply)
      return;
    }
    if (id && id.startsWith('reply-')) {
      this.activeDialogue = null;
      this.advanceKnutConversation();
      return;
    }
    if (id === 'investigate-intro') {
      this.activeDialogue = null;
      this.currentState = GameState.InvestigatePhase1;
      this.showHintPulse();
      return;
    }
    if (id && id.startsWith('investigate-')) {
      this.activeDialogue = null;
      // Zoom back out and check phase progression
      this.goBack();
      setTimeout(() => this.advanceInvestigationPhase(), ESCAPE_ROOM_TIMING.zoomOutDelay + 50);
      return;
    }
    if (id === 'phase1-done' || id === 'phase2-done' || id === 'phase3-done') {
      this.activeDialogue = null;
      this.showHintPulse();
      return;
    }
    if (id === 'investigate-complete') {
      this.activeDialogue = null;
      return;
    }
    // Default: dismiss
    this.activeDialogue = null;
  }

  protected override onDestroy(): void {
    if (this.knutArriveTimeout) clearTimeout(this.knutArriveTimeout);
  }

  // ── Skip-puzzle handlers ──
  public skipCleanRoom(): void {
    if (this.currentState !== GameState.CleanRoom) return;
    for (const it of this.cleanableItems) it.cleaned = true;
    this.recordPuzzleScore('clean_room', 99, true);
    this.activeDialogue = null;
    this.currentState = GameState.CleanRoomDone;
    this.updateBackground();
    this.scheduleKnutArrival();
  }

  public skipKnutConversation(): void {
    if (this.currentState !== GameState.KnutConversation) return;
    this.recordPuzzleScore('knut_conversation', 99, true);
    this.activeDialogue = null;
    this.conversationShowReply = false;
    this.currentState = GameState.InvestigateIntro;
    this.updateBackground();
    setTimeout(() => {
      this.showDialogue({ character: '', text: this.t('puzzles.investigate.introThought'), id: 'investigate-intro' });
    }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
  }

  public skipInvestigate(): void {
    if (!this.isInvestigationActive()) return;
    const all = [...this.phase1Objects, ...this.phase2Objects, ...this.phase3Objects, ...this.phase4Objects];
    for (const k of all) this.investigatedObjects.add(k);
    this.isVentOpen = true;
    this.isTablesBoxOpen = true;
    this.isChargersBoxOpen = true;
    this.isPansBoxOpen = true;
    this.isMarketsBoxPeeled = true;
    this.isHalfOpenDoorClosed = true;
    this.recordPuzzleScore('investigate', 99, true);
    this.activeDialogue = null;
    this.currentView = 'main';
    this.currentState = GameState.DefineProblem;
    this.updateBackground();
  }

  public skipDefineProblem(): void {
    if (this.currentState !== GameState.DefineProblem && this.currentState !== GameState.DefineProblemExplained) return;
    this.recordPuzzleScore('define_problem', 99, true);
    const correctOpt = this.defineOptions.find(o => o.correct);
    if (correctOpt) {
      this.selectedDefineOption = correctOpt.id;
      this.puzzleFeedback = this.t(`puzzles.defineProblem.tooltips.${correctOpt.id}`);
    }
    this.defineAnswerCorrect = true;
    this.currentState = GameState.DefineProblemExplained;
  }

  // ── Hints ──
  protected override getHintText(): string {
    switch (this.currentState) {
      case GameState.ReadStickyNote: return this.t('hints.stickyNote');
      case GameState.StickyNoteOpen: return this.t('hints.readStickyNote');
      case GameState.CleanRoomIntro:
      case GameState.CleanRoom: return this.t('hints.cleanRoom');
      case GameState.WaitForKnut: return this.t('hints.waitForKnut');
      case GameState.KnutArrived: return this.t('hints.knutArrival');
      case GameState.KnutConversation: return this.t('hints.knutConversation');
      case GameState.InvestigateIntro:
      case GameState.InvestigatePhase1: return this.t('hints.investigatePhase1');
      case GameState.InvestigatePhase2: return this.t('hints.investigatePhase2');
      case GameState.InvestigatePhase3: return this.t('hints.investigatePhase3');
      case GameState.InvestigatePhase4: return this.t('hints.investigatePhase4');
      case GameState.DefineProblem: return this.t('hints.defineProblem');
      case GameState.DefineProblemExplained: return this.t('hints.defineProblemExplained');
      case GameState.DoorOpen: return this.t('hints.completion');
      default: return this.t('hints.default');
    }
  }
}

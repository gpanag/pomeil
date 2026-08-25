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
import { EscapeRoomConfig, ESCAPE_ROOM_TIMING } from '../shared/escape-room/escape-room.interfaces';

// --- Game State ---
// No linear state machine: puzzles can be done in any order.
// We track completion of each puzzle and overall progress.
enum GameState {
  Exploring,           // Free roam, clicking objects
  Puzzle_Customers,    // At the window: classify customers
  Puzzle_ValueProp,    // At the flip chart: remove buzzwords
  Puzzle_Channels,     // At the TV: match channels
  Puzzle_Revenue,      // At the papers: classify revenue docs
  Puzzle_Costs,        // At the folder: classify fixed/variable
  CanvasView,          // Whiteboard: view completed canvas
  Completion           // Door open, can exit
}

type ViewState = 'main' | 'window' | 'flipchart' | 'tv' | 'papers' | 'folder' | 'whiteboard';

const imagePaths = {
  base: '/assets/images/business_planning/conference_room.png',
  base_door_open: '/assets/images/business_planning/conference_room_door_open.png',
  zoom_window: '/assets/images/business_planning/zoom_window.png',
  zoom_window_clean: '/assets/images/business_planning/zoom_window_clean.png',
  zoom_flipchart: '/assets/images/business_planning/zoom_flipchart.png',
  zoom_tv: '/assets/images/business_planning/zoom_tv.png',
  zoom_papers: '/assets/images/business_planning/zoom_papers.png',
  zoom_folder: '/assets/images/business_planning/zoom_folder.png',
  zoom_whiteboard: '/assets/images/business_planning/zoom_whiteboard.png',
};

const roomConfig: EscapeRoomConfig = {
  roomId: 'business-planning',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: true,
  imageWidth: 1584,
  imageHeight: 1056,
};

// --- Customer data ---
interface CustomerCard {
  id: string;
  valid: boolean;
  classified: boolean;
  correct: boolean | null;
}

// --- Revenue document data ---
interface RevenueDocument {
  id: string;
  correctCategory: string;
  assigned: string | null;
  isReading: boolean;
}

// --- Cost item data ---
interface CostItem {
  id: string;
  correctType: string;
  assigned: string | null;
  isWrong: boolean;
}

@Component({
  selector: 'app-business-planning-module1',
  templateUrl: './business-planning-module1.component.html',
  styleUrl: './business-planning-module1.component.scss',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
  animations: [fadeInOut]
})
export class BusinessPlanningModule1Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  // TrackBy functions
  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;
  trackByKey = (_: number, item: { key: string }) => item.key;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Exploring;
  public currentView: ViewState = 'main';

  // Hint system
  public isHintDialogue: boolean = false;

  // Puzzle completion flags
  public puzzleCustomersDone = false;
  public puzzleValuePropDone = false;
  public puzzleChannelsDone = false;
  public puzzleRevenueDone = false;
  public puzzleCostsDone = false;

  // Canvas view state
  public isCanvasVisible = false;
  public hoveredCanvasBlock: string | null = null;

  // Window state (squeegee interaction)
  public isWindowFogged = true;

  // --- Puzzle 1: Customer Segments ---
  public currentCustomerIndex = 0;
  public customerCards: CustomerCard[] = [
    { id: '0', valid: true, classified: false, correct: null },
    { id: '1', valid: true, classified: false, correct: null },
    { id: '2', valid: true, classified: false, correct: null },
    { id: '3', valid: false, classified: false, correct: null },
    { id: '4', valid: true, classified: false, correct: null },
    { id: '5', valid: false, classified: false, correct: null },
    { id: '6', valid: true, classified: false, correct: null },
    { id: '7', valid: true, classified: false, correct: null },
    { id: '8', valid: false, classified: false, correct: null },
    { id: '9', valid: false, classified: false, correct: null },
    { id: '10', valid: true, classified: false, correct: null },
  ];
  public customerWrongAttempts = 0;
  public puzzle1TotalWrong = 0;
  public puzzle1WasRevealed = false;
  public customerFeedback = '';
  public showInvalidExplanation = false;
  public invalidExplanationText = '';

  get currentCustomerCard(): CustomerCard | null {
    if (this.currentCustomerIndex >= this.customerCards.length) return null;
    return this.customerCards[this.currentCustomerIndex];
  }

  get classifiedCustomerCount(): number {
    return this.customerCards.filter(c => c.classified).length;
  }

  // --- Puzzle 2: Value Proposition ---
  // Parts that should be removed (struck through): indices 0, 2, 4, 5, 6
  // Parts to keep: indices 1, 3
  public valuePropStruckParts: Set<number> = new Set();
  public valuePropWrongAttempts = 0;
  public puzzle2TotalWrong = 0;
  public puzzle2WasRevealed = false;

  get valuePropParts(): { id: string; index: number }[] {
    return [0, 1, 2, 3, 4, 5, 6].map(i => ({ id: 'vp_' + i, index: i }));
  }

  // --- Puzzle 3: Channels ---
  public channelBehaviorIndex = 0;
  public channelCurrentOptionIndex = 0;
  public channelCorrectAnswers = ['Social Media', 'Word of Mouth', 'Physical Location', 'Direct Contact via Email or Phone'];
  public channelSolvedCount = 0;
  public channelWrongAttempts = 0;
  public puzzle3TotalWrong = 0;
  public puzzle3WasRevealed = false;
  public channelStarted = false;

  get channelOptions(): string[] {
    const raw = this.t('puzzles.channels.channelOptions');
    // channelOptions is a JSON array stored in i18n
    if (Array.isArray(raw)) return raw;
    // fallback: build from indexed keys
    const opts: string[] = [];
    for (let i = 0; i < 9; i++) {
      const val = this.t('puzzles.channels.channelOptions.' + i);
      if (val && !val.startsWith('[')) opts.push(val);
    }
    return opts;
  }

  get currentChannelOption(): string {
    const opts = this.channelOptions;
    if (opts.length === 0) return '';
    return opts[this.channelCurrentOptionIndex % opts.length];
  }

  // --- Puzzle 4: Revenue Streams ---
  public revenueDocuments: RevenueDocument[] = [
    { id: '0', correctCategory: 'subscription', assigned: null, isReading: false },
    { id: '1', correctCategory: 'one-time', assigned: null, isReading: false },
    { id: '2', correctCategory: 'usage-based', assigned: null, isReading: false },
    { id: '3', correctCategory: 'freemium', assigned: null, isReading: false },
  ];
  public currentRevenueDoc: RevenueDocument | null = null;
  public revenueWrongAttempts = 0;
  public puzzle4TotalWrong = 0;
  public puzzle4WasRevealed = false;

  get revenueCategories(): { id: string; label: string }[] {
    return [
      { id: 'subscription', label: this.t('puzzles.revenueStreams.categories.subscription') },
      { id: 'one-time', label: this.t('puzzles.revenueStreams.categories.one-time') },
      { id: 'usage-based', label: this.t('puzzles.revenueStreams.categories.usage-based') },
      { id: 'freemium', label: this.t('puzzles.revenueStreams.categories.freemium') },
    ];
  }

  get unassignedRevenueDocs(): RevenueDocument[] {
    return this.revenueDocuments.filter(d => d.assigned === null);
  }

  // --- Puzzle 5: Cost Structure ---
  public costItems: CostItem[] = [
    { id: '0', correctType: 'fixed', assigned: null, isWrong: false },
    { id: '1', correctType: 'fixed', assigned: null, isWrong: false },
    { id: '2', correctType: 'fixed', assigned: null, isWrong: false },
    { id: '3', correctType: 'fixed', assigned: null, isWrong: false },
    { id: '4', correctType: 'variable', assigned: null, isWrong: false },
    { id: '5', correctType: 'variable', assigned: null, isWrong: false },
    { id: '6', correctType: 'variable', assigned: null, isWrong: false },
    { id: '7', correctType: 'variable', assigned: null, isWrong: false },
  ];
  public costsWrongAttempts = 0;
  public puzzle5TotalWrong = 0;
  public puzzle5WasRevealed = false;
  public costsChecked = false;

  get allCostsAssigned(): boolean {
    return this.costItems.every(c => c.assigned !== null);
  }

  // --- Hotspot definitions ---
  hotspots = {
    main: {
      window: { x: 83, y: 0, width: 16, height: 74 },
      flipchart: { x: 0, y: 33, width: 14, height: 64 },
      tvRemote: { x: 59, y: 28, width: 15, height: 14 },
      papers: { x: 34, y: 61, width: 12, height: 7 },
      folder: { x: 43, y: 55, width: 10, height: 6 },
      whiteboard: { x: 44, y: 28, width: 10, height: 13 },
      exitDoor: { x: 0, y: 0, width: 18, height: 83 },
    },
    window_zoom: {
      squeegee: { x: 10, y: 70, width: 27, height: 22 },
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    flipchart_zoom: {
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    tv_zoom: {
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    papers_zoom: {
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    folder_zoom: {
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
    whiteboard_zoom: {
      content: { x: 15, y: 15, width: 70, height: 70 },
    },
  };

  // --- Main View / Quiz Active ---
  public override get isMainViewActive(): boolean {
    return this.currentView === 'main';
  }

  public override get isQuizActive(): boolean {
    return this.currentState === GameState.Puzzle_Customers ||
      this.currentState === GameState.Puzzle_ValueProp ||
      this.currentState === GameState.Puzzle_Channels ||
      this.currentState === GameState.Puzzle_Revenue ||
      this.currentState === GameState.Puzzle_Costs;
  }

  get completedPuzzlesCount(): number {
    let count = 0;
    if (this.puzzleCustomersDone) count++;
    if (this.puzzleValuePropDone) count++;
    if (this.puzzleChannelsDone) count++;
    if (this.puzzleRevenueDone) count++;
    if (this.puzzleCostsDone) count++;
    return count;
  }

  get allPuzzlesDone(): boolean {
    return this.completedPuzzlesCount === 5;
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
    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }

    switch (this.currentView) {
      case 'window':
        this.currentBackgroundUrl = this.isWindowFogged ? imagePaths.zoom_window : imagePaths.zoom_window_clean;
        break;
      case 'flipchart': this.currentBackgroundUrl = imagePaths.zoom_flipchart; break;
      case 'tv': this.currentBackgroundUrl = imagePaths.zoom_tv; break;
      case 'papers': this.currentBackgroundUrl = imagePaths.zoom_papers; break;
      case 'folder': this.currentBackgroundUrl = imagePaths.zoom_folder; break;
      case 'whiteboard': this.currentBackgroundUrl = imagePaths.zoom_whiteboard; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  // --- Hints ---
  protected override onHintRequested(): void {
    this.isHintDialogue = true;
  }

  protected override getHintText(): string {
    if (this.currentState === GameState.Completion) return this.t('hints.completion');
    if (this.currentState === GameState.CanvasView) return this.t('hints.whiteboard');
    if (this.allPuzzlesDone && this.currentState === GameState.Exploring) return this.t('hints.whiteboard');

    // While a puzzle is active, give that puzzle's own task hint
    if (this.currentState === GameState.Puzzle_Customers) return this.t('hints.puzzle_customers');
    if (this.currentState === GameState.Puzzle_ValueProp) return this.t('puzzles.valueProposition.feedback.hint');
    if (this.currentState === GameState.Puzzle_Channels) return this.t('hints.puzzle_channels');
    if (this.currentState === GameState.Puzzle_Revenue) return this.t('hints.puzzle_revenue');
    if (this.currentState === GameState.Puzzle_Costs) return this.t('hints.puzzle_costs');

    // Suggest uncompleted puzzles (Exploring state only)
    if (!this.puzzleCustomersDone) return this.t('hints.window');
    if (!this.puzzleValuePropDone) return this.t('hints.flipchart');
    if (!this.puzzleChannelsDone) return this.t('hints.tv');
    if (!this.puzzleRevenueDone) return this.t('hints.papers');
    if (!this.puzzleCostsDone) return this.t('hints.folder');

    return this.t('hints.default');
  }

  // --- Hotspot Clicks ---
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

    // Whiteboard — only when all puzzles done
    if (target === 'whiteboard' && this.allPuzzlesDone && this.currentView === 'main') {
      this.zoomToLocation(target, this.hotspots.main, () => {
        this.currentView = 'whiteboard';
        this.updateBackground();
        this.resetZoom(true);
        // Player must click hotspot within zoomed view
      }, 2.5);
      return;
    }

    if (this.currentView === 'main') {
      // Window
      if (target === 'window' && !this.puzzleCustomersDone) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'window';
          this.updateBackground();
          this.resetZoom(true);
          // Player must click hotspot within zoomed view
        }, 2.5);
        return;
      }

      // Flip chart
      if (target === 'flipchart' && !this.puzzleValuePropDone) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'flipchart';
          this.updateBackground();
          this.resetZoom(true);
          // Player must click hotspot within zoomed view
        }, 2.5);
        return;
      }

      // TV Remote
      if (target === 'tvRemote' && !this.puzzleChannelsDone) {
        this.zoomToLocation('tvRemote', this.hotspots.main, () => {
          this.currentView = 'tv';
          this.updateBackground();
          this.resetZoom(true);
          // Player must click hotspot within zoomed view
        }, 2.5);
        return;
      }

      // Papers
      if (target === 'papers' && !this.puzzleRevenueDone) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'papers';
          this.updateBackground();
          this.resetZoom(true);
          // Player must click hotspot within zoomed view
        }, 2.5);
        return;
      }

      // Folder
      if (target === 'folder' && !this.puzzleCostsDone) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = 'folder';
          this.updateBackground();
          this.resetZoom(true);
          // Player must click hotspot within zoomed view
        }, 2.5);
        return;
      }
    }

    // --- Clicks within zoomed views ---
    if (this.currentView === 'whiteboard' && target === 'whiteboardContent' && this.allPuzzlesDone) {
      this.playSound('paper-rustle.wav');
      this.currentState = GameState.CanvasView;
      this.isCanvasVisible = true;
      return;
    }
    if (this.currentView === 'window' && target === 'windowContent' && !this.puzzleCustomersDone) {
      if (this.isWindowFogged) {
        this.playSound('paper-rustle.wav');
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.windowFogged'), id: 'system_windowFogged' });
      } else {
        this.currentState = GameState.Puzzle_Customers;
      }
      return;
    }
    if (this.currentView === 'flipchart' && target === 'flipchartContent' && !this.puzzleValuePropDone) {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.flipchartIntro'), id: 'system_flipchartIntro' });
      return;
    }
    if (this.currentView === 'tv' && target === 'tvContent' && !this.puzzleChannelsDone) {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.tvIntro'), id: 'system_tvIntro' });
      return;
    }
    if (this.currentView === 'papers' && target === 'papersContent' && !this.puzzleRevenueDone) {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.papersIntro'), id: 'system_papersIntro' });
      return;
    }
    if (this.currentView === 'folder' && target === 'folderContent' && !this.puzzleCostsDone) {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.folderIntro'), id: 'system_folderIntro' });
      return;
    }

    // Squeegee in window zoom
    if (this.currentView === 'window' && target === 'squeegee' && this.isWindowFogged) {
      this.playSound('paper-rustle.wav');
      this.isWindowFogged = false;
      this.updateBackground();
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.windowCleaned'), id: 'system_windowCleaned' });
    }
  }

  // --- Dialogue dismissal ---
  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;

    if (this.isHintDialogue) {
      this.isHintDialogue = false;
      this.showHintPulse();
    } else {
      this.showHints = false;
    }

    // After window fogged message — player should click squeegee
    if (id === 'system_windowFogged') {
      // Wait for squeegee click
    }
    // After window cleaned — start customer puzzle
    else if (id === 'system_windowCleaned') {
      this.currentState = GameState.Puzzle_Customers;
    }
    // After flipchart intro — start value prop puzzle
    else if (id === 'system_flipchartIntro') {
      this.currentState = GameState.Puzzle_ValueProp;
    }
    // After TV intro — start channels puzzle
    else if (id === 'system_tvIntro') {
      this.currentState = GameState.Puzzle_Channels;
    }
    // After papers intro — start revenue puzzle
    else if (id === 'system_papersIntro') {
      this.currentState = GameState.Puzzle_Revenue;
    }
    // After folder intro — start costs puzzle
    else if (id === 'system_folderIntro') {
      this.currentState = GameState.Puzzle_Costs;
    }
    // After individual puzzle complete
    else if (id === 'system_puzzleComplete') {
      this.currentState = GameState.Exploring;
      this.currentView = 'main';
      this.updateBackground();
      if (this.allPuzzlesDone) {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allPuzzlesComplete'), id: 'system_allPuzzlesComplete' });
      }
    }
    // After all puzzles complete message
    else if (id === 'system_allPuzzlesComplete') {
      // Player should click whiteboard
    }
    // After canvas viewed → door opens
    else if (id === 'system_canvasViewed') {
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.playDoorSound();
      this.currentView = 'main';
      this.updateBackground();
    }
    // Default: update background
    else {
      this.updateBackground();
    }
  }

  handleDialogueDismiss(): void {
    this.dismissDialogue();
  }

  // --- Intro popup closed ---
  protected override onIntroPopupClosed(): void {
    // Pulse the available stations so the player sees where to start.
    this.showHints = true;
    this.showHintPulse();
  }

  // --- Zoom back ---
  protected override resetZoomState(): void {
    // When going back, if in a puzzle state, return to exploring
    if (this.currentState !== GameState.Completion && this.currentState !== GameState.CanvasView) {
      this.currentState = GameState.Exploring;
    }
    this.currentView = 'main';
    this.isCanvasVisible = false;
  }

  // =========================================================
  // PUZZLE 1: Customer Segments
  // =========================================================

  classifyCustomer(isValid: boolean): void {
    const card = this.currentCustomerCard;
    if (!card) return;

    const isCorrect = card.valid === isValid;
    if (isCorrect) {
      this.playSound('success-chime.wav');
      card.classified = true;
      card.correct = true;
      this.customerFeedback = this.t('puzzles.customerSegments.feedback.correct');
      this.customerWrongAttempts = 0;

      // Show explanation for invalid ones
      if (!card.valid) {
        this.showInvalidExplanation = true;
        this.invalidExplanationText = this.t('puzzles.customerSegments.invalidExplanations.' + card.id);
      } else {
        this.showInvalidExplanation = false;
        this.advanceCustomer();
      }
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.customerWrongAttempts++;
      this.puzzle1TotalWrong++;

      if (this.customerWrongAttempts >= 3) {
        this.puzzle1WasRevealed = true;
        // Reveal answer for this card
        card.classified = true;
        card.correct = false;
        this.customerWrongAttempts = 0;

        if (!card.valid) {
          this.showInvalidExplanation = true;
          this.invalidExplanationText = this.t('puzzles.customerSegments.invalidExplanations.' + card.id);
        } else {
          this.customerFeedback = this.t('puzzles.customerSegments.feedback.correct');
          this.advanceCustomer();
        }
      } else {
        this.customerFeedback = this.t('puzzles.customerSegments.feedback.wrong');
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  dismissInvalidExplanation(): void {
    this.showInvalidExplanation = false;
    this.advanceCustomer();
  }

  private advanceCustomer(): void {
    this.customerFeedback = '';
    this.currentCustomerIndex++;

    if (this.currentCustomerIndex >= this.customerCards.length) {
      // All classified
      this.puzzleCustomersDone = true;
      this.recordPuzzleScore('Customer Segments', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
      setTimeout(() => {
        this.currentState = GameState.Exploring;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.customerSegments.feedback.allCorrect'), id: 'system_puzzleComplete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }
  }

  skipPuzzleCustomers(): void {
    this.recordPuzzleScore('Customer Segments', 99, true);
    this.puzzleCustomersDone = true;
    this.puzzleFeedback = '';
    this.currentState = GameState.Exploring;
    this.currentView = 'main';
    this.updateBackground();
    if (this.allPuzzlesDone) {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allPuzzlesComplete'), id: 'system_allPuzzlesComplete' });
    }
  }

  // =========================================================
  // PUZZLE 2: Value Proposition
  // =========================================================

  toggleValuePropPart(index: number): void {
    if (this.valuePropStruckParts.has(index)) {
      this.valuePropStruckParts.delete(index);
    } else {
      this.valuePropStruckParts.add(index);
    }
    // Force change detection by creating new Set
    this.valuePropStruckParts = new Set(this.valuePropStruckParts);
  }

  isValuePropStruck(index: number): boolean {
    return this.valuePropStruckParts.has(index);
  }

  submitValueProp(): void {
    const correctRemove = new Set([0, 2, 4, 5, 6]);
    const isCorrect = this.valuePropStruckParts.size === correctRemove.size &&
      [...this.valuePropStruckParts].every(i => correctRemove.has(i));

    if (isCorrect) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.puzzleValuePropDone = true;
      this.recordPuzzleScore('Value Proposition', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
      setTimeout(() => {
        this.currentState = GameState.Exploring;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.valueProposition.feedback.correct'), id: 'system_puzzleComplete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.valuePropWrongAttempts++;
      this.puzzle2TotalWrong++;

      if (this.valuePropWrongAttempts >= 3) {
        // Show hint on 3rd wrong
        this.puzzleFeedback = this.t('puzzles.valueProposition.feedback.hint');
      }

      if (this.valuePropWrongAttempts >= 4) {
        this.puzzle2WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.valueProposition.answerOverlay');
        this.answerOverlayCallback = () => {
          this.valuePropStruckParts = new Set([0, 2, 4, 5, 6]);
          this.puzzleValuePropDone = true;
          this.recordPuzzleScore('Value Proposition', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
          this.currentState = GameState.Exploring;
          this.currentView = 'main';
          this.updateBackground();
          if (this.allPuzzlesDone) {
            this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allPuzzlesComplete'), id: 'system_allPuzzlesComplete' });
          }
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.valuePropWrongAttempts >= 3
          ? this.t('puzzles.valueProposition.feedback.hint')
          : this.t('puzzles.valueProposition.feedback.wrong');
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  skipPuzzleValueProp(): void {
    this.recordPuzzleScore('Value Proposition', 99, true);
    this.puzzleValuePropDone = true;
    this.puzzleFeedback = '';
    this.currentState = GameState.Exploring;
    this.currentView = 'main';
    this.updateBackground();
    if (this.allPuzzlesDone) {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allPuzzlesComplete'), id: 'system_allPuzzlesComplete' });
    }
  }

  // =========================================================
  // PUZZLE 3: Channels
  // =========================================================

  startChannelsPuzzle(): void {
    this.channelStarted = true;
  }

  prevChannel(): void {
    const opts = this.channelOptions;
    if (opts.length === 0) return;
    this.channelCurrentOptionIndex = (this.channelCurrentOptionIndex - 1 + opts.length) % opts.length;
  }

  nextChannel(): void {
    const opts = this.channelOptions;
    if (opts.length === 0) return;
    this.channelCurrentOptionIndex = (this.channelCurrentOptionIndex + 1) % opts.length;
  }

  confirmChannel(): void {
    const correctChannel = this.channelCorrectAnswers[this.channelBehaviorIndex];
    const selected = this.currentChannelOption;

    if (selected === correctChannel) {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.channelWrongAttempts = 0;
      this.channelSolvedCount++;
      this.channelBehaviorIndex++;
      this.channelCurrentOptionIndex = 0;

      if (this.channelSolvedCount >= 4) {
        this.puzzleChannelsDone = true;
        this.recordPuzzleScore('Channels', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
        setTimeout(() => {
          this.currentState = GameState.Exploring;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.channels.feedback.allCorrect'), id: 'system_puzzleComplete' });
        }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
      }
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.channelWrongAttempts++;
      this.puzzle3TotalWrong++;

      if (this.channelWrongAttempts >= 3) {
        this.puzzle3WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.channels.answerOverlay');
        this.answerOverlayCallback = () => {
          this.channelWrongAttempts = 0;
          this.channelSolvedCount = 4;
          this.puzzleChannelsDone = true;
          this.recordPuzzleScore('Channels', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
          this.currentState = GameState.Exploring;
          this.currentView = 'main';
          this.updateBackground();
          if (this.allPuzzlesDone) {
            this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allPuzzlesComplete'), id: 'system_allPuzzlesComplete' });
          }
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.channels.feedback.wrong');
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  skipPuzzleChannels(): void {
    this.recordPuzzleScore('Channels', 99, true);
    this.puzzleChannelsDone = true;
    this.puzzleFeedback = '';
    this.currentState = GameState.Exploring;
    this.currentView = 'main';
    this.updateBackground();
    if (this.allPuzzlesDone) {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allPuzzlesComplete'), id: 'system_allPuzzlesComplete' });
    }
  }

  // =========================================================
  // PUZZLE 4: Revenue Streams
  // =========================================================

  openRevenueDoc(doc: RevenueDocument): void {
    if (doc.assigned !== null) return;
    this.currentRevenueDoc = doc;
  }

  closeRevenueDoc(): void {
    this.currentRevenueDoc = null;
  }

  assignRevenueCategory(categoryId: string): void {
    if (!this.currentRevenueDoc) return;

    if (this.currentRevenueDoc.correctCategory === categoryId) {
      this.playSound('success-chime.wav');
      this.currentRevenueDoc.assigned = categoryId;
      this.currentRevenueDoc = null;
      this.puzzleFeedback = '';
      this.revenueWrongAttempts = 0;

      const allDone = this.revenueDocuments.every(d => d.assigned !== null);
      if (allDone) {
        this.puzzleRevenueDone = true;
        this.recordPuzzleScore('Revenue Streams', this.puzzle4TotalWrong, this.puzzle4WasRevealed);
        setTimeout(() => {
          this.currentState = GameState.Exploring;
          this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.revenueStreams.feedback.allCorrect'), id: 'system_puzzleComplete' });
        }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
      }
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.revenueWrongAttempts++;
      this.puzzle4TotalWrong++;

      if (this.revenueWrongAttempts >= 3) {
        this.puzzle4WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.revenueStreams.answerOverlay');
        this.answerOverlayCallback = () => {
          this.revenueWrongAttempts = 0;
          // Auto-assign all
          for (const doc of this.revenueDocuments) {
            doc.assigned = doc.correctCategory;
          }
          this.currentRevenueDoc = null;
          this.puzzleRevenueDone = true;
          this.recordPuzzleScore('Revenue Streams', this.puzzle4TotalWrong, this.puzzle4WasRevealed);
          this.currentState = GameState.Exploring;
          this.currentView = 'main';
          this.updateBackground();
          if (this.allPuzzlesDone) {
            this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allPuzzlesComplete'), id: 'system_allPuzzlesComplete' });
          }
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.revenueStreams.feedback.wrong');
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  skipPuzzleRevenue(): void {
    this.recordPuzzleScore('Revenue Streams', 99, true);
    this.puzzleRevenueDone = true;
    this.puzzleFeedback = '';
    this.currentRevenueDoc = null;
    this.currentState = GameState.Exploring;
    this.currentView = 'main';
    this.updateBackground();
    if (this.allPuzzlesDone) {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allPuzzlesComplete'), id: 'system_allPuzzlesComplete' });
    }
  }

  // =========================================================
  // PUZZLE 5: Cost Structure
  // =========================================================

  assignCostType(costItem: CostItem, type: string): void {
    costItem.assigned = type;
    costItem.isWrong = false;
    this.costsChecked = false;
  }

  checkCosts(): void {
    this.costsChecked = true;
    let allCorrect = true;

    for (const item of this.costItems) {
      if (item.assigned !== item.correctType) {
        item.isWrong = true;
        allCorrect = false;
      } else {
        item.isWrong = false;
      }
    }

    if (allCorrect) {
      this.playSound('success-chime.wav');
      this.puzzleCostsDone = true;
      this.puzzleFeedback = '';
      this.recordPuzzleScore('Cost Structure', this.puzzle5TotalWrong, this.puzzle5WasRevealed);
      setTimeout(() => {
        this.currentState = GameState.Exploring;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.costStructure.feedback.correct'), id: 'system_puzzleComplete' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.costsWrongAttempts++;
      this.puzzle5TotalWrong++;

      if (this.costsWrongAttempts >= 3) {
        this.puzzle5WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.costStructure.answerOverlay');
        this.answerOverlayCallback = () => {
          this.costsWrongAttempts = 0;
          // Auto-assign all correctly
          for (const item of this.costItems) {
            item.assigned = item.correctType;
            item.isWrong = false;
          }
          this.puzzleCostsDone = true;
          this.recordPuzzleScore('Cost Structure', this.puzzle5TotalWrong, this.puzzle5WasRevealed);
          this.currentState = GameState.Exploring;
          this.currentView = 'main';
          this.updateBackground();
          if (this.allPuzzlesDone) {
            this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allPuzzlesComplete'), id: 'system_allPuzzlesComplete' });
          }
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.costStructure.feedback.wrong');
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  skipPuzzleCosts(): void {
    this.recordPuzzleScore('Cost Structure', 99, true);
    this.puzzleCostsDone = true;
    this.puzzleFeedback = '';
    this.currentState = GameState.Exploring;
    this.currentView = 'main';
    this.updateBackground();
    if (this.allPuzzlesDone) {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.allPuzzlesComplete'), id: 'system_allPuzzlesComplete' });
    }
  }

  // =========================================================
  // CANVAS
  // =========================================================

  hoverCanvasBlock(block: string): void {
    this.hoveredCanvasBlock = block;
  }

  leaveCanvasBlock(): void {
    this.hoveredCanvasBlock = null;
  }

  finishEscapeRoom(): void {
    this.isCanvasVisible = false;
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.canvasViewed'), id: 'system_canvasViewed' });
  }
}

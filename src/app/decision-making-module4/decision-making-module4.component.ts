import { Component, Inject, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EscapeRoomBaseComponent } from '../shared/escape-room/escape-room-base.component';
import { EscapeRoomTextService } from '../shared/escape-room/escape-room-text.service';
import { fadeInOut } from '../shared/escape-room/escape-room.animations';
import { Dialogue, EscapeRoomConfig, CharacterImageMap, ESCAPE_ROOM_TIMING } from '../shared/escape-room/escape-room.interfaces';

import { RoomHelpButtonComponent } from '../shared/escape-room/room-help-button/room-help-button.component';
/**
 * Decision-Making Escape Room (Module 4).
 *
 * Unique features compared to other rooms:
 * - No NPCs (characters). The player is alone in a stuck elevator.
 * - Linear narrative driven by a decision-making flowchart.
 * - No traditional puzzle scoring (True/False, matching, etc.).
 *   Instead, the player evaluates alternatives via criteria and picks one.
 * - The "puzzles" are: gather info, reveal alternatives, reveal outcomes,
 *   evaluate via criteria, select alternative, review outcome.
 */

enum GameState {
  Intro,
  OutsideElevator,
  EnterElevator,
  PressFloorButton,
  ElevatorMoving,
  ElevatorMalfunction,
  StalledDialogue1,
  StalledDialogue2,
  GatherInfo,
  GatherInfoComplete,
  IdentifyAlternatives,
  AlternativesRevealed,
  IdentifyOutcomes,
  OutcomesRevealed,
  EvaluateAlternatives,
  EvaluationComplete,
  SelectAlternative,
  TakeAction,
  ReviewOutcome,
  Completion
}

type ViewState = 'outside' | 'main' | 'floorIndicator' | 'roofLamp' | 'buttonPanel' |
  'wirePanel' | 'inspectionPlaque' | 'safetyPoster' | 'incidentPoster' | 'roofHatch' | 'noticeBoard';

/** Criteria match values for flowchart evaluation. */
type CriteriaMatch = 'match' | 'neutral' | 'mismatch';

interface Alternative {
  id: string;
  label: string;
  outcomes: string[];
  risk: CriteriaMatch;
  timeCost: CriteriaMatch;
  resourceUse: CriteriaMatch;
  control: CriteriaMatch;
  tooltips: { [criterion: string]: string };
  actualOutcome: { summary: string; sound: string };
}

const imagePaths = {
  outside: '/assets/images/decision_making/outside_elevator.png',
  outside_doors_open: '/assets/images/decision_making/outside_doors_open.png',
  inside_facing_panel: '/assets/images/decision_making/inside_facing_panel.png',
  inside_facing_doors: '/assets/images/decision_making/inside_facing_doors.png',
  inside_lights_off: '/assets/images/decision_making/inside_lights_off.png',
  inside_lights_on: '/assets/images/decision_making/inside_main.png',
  zoom_floor_indicator: '/assets/images/decision_making/zoom_floor_indicator.png',
  zoom_roof_lamp: '/assets/images/decision_making/zoom_roof_lamp.png',
  zoom_button_panel: '/assets/images/decision_making/zoom_button_panel.png',
  zoom_wire_panel: '/assets/images/decision_making/zoom_wire_panel.png',
  zoom_inspection_plaque: '/assets/images/decision_making/zoom_inspection_plaque.png',
  zoom_safety_poster: '/assets/images/decision_making/zoom_safety_poster.png',
  zoom_incident_poster: '/assets/images/decision_making/zoom_incident_poster.png',
  zoom_roof_hatch: '/assets/images/decision_making/zoom_roof_hatch.png',
  zoom_notice_board: '/assets/images/decision_making/zoom_notice_board.png',
  notice_board_revealed: '/assets/images/decision_making/notice_board_revealed.png',
  escape_outcome: '/assets/images/decision_making/escape_outcome.png',
};

const roomConfig: EscapeRoomConfig = {
  roomId: 'decision-making',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 1.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

const ALTERNATIVE_KEYS = [
  'pressAlarm', 'callOut', 'pryDoors', 'climbHatch',
  'clickFloorButton', 'jumpActivate', 'fixWiring', 'waitRescue'
] as const;

const CRITERIA_KEYS = ['risk', 'timeCost', 'resourceUse', 'control'] as const;

@Component({
    selector: 'app-decision-making-module4',
    templateUrl: './decision-making-module4.component.html',
    styleUrl: './decision-making-module4.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule, MatTooltipModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class DecisionMakingModule4Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  trackByIndex = (index: number) => index;
  trackById = (_: number, item: { id: string }) => item.id;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'outside';

  public isHintDialogue: boolean = false;

  // --- No characters in this room ---
  override get characterImages(): CharacterImageMap { return {}; }

  protected override canInteractWithCharacter(): boolean { return false; }

  public override get isMainViewActive(): boolean {
    return this.currentView === 'main' || this.currentView === 'outside';
  }

  public override get isQuizActive(): boolean {
    return false; // No traditional puzzles in this room
  }

  // --- Gather Info tracking ---
  clickedInfoItems: Set<string> = new Set();
  readonly infoItems = [
    'floorIndicator', 'roofLamp', 'buttonPanel', 'wirePanel',
    'inspectionPlaque', 'safetyPoster', 'incidentPoster', 'roofHatch'
  ];
  incidentPosterClicks: number = 0;
  isIncidentReset: boolean = false;

  // --- Flowchart state ---
  revealedAlternatives: Set<string> = new Set();
  revealedOutcomes: Set<string> = new Set();
  activeCriterion: string | null = null;
  clickedCriteria: Set<string> = new Set();
  selectedAlternativeId: string | null = null;
  chosenAlternative: Alternative | null = null;

  // --- Item overlay states ---
  isInspectionPlaqueVisible: boolean = false;
  isSafetyPosterVisible: boolean = false;

  // --- Elevator animation ---
  currentFloor: number = 1;
  isElevatorMoving: boolean = false;
  isLightsOff: boolean = false;

  hotspots = {
    outside: {
      callButton: { x: 72, y: 47, width: 3, height: 15 },
      elevatorInside: { x: 30, y: 7, width: 39, height: 87 },
    },
    main: {
      floorIndicator: { x: 73, y: 48, width: 6, height: 12 },
      roofLamp: { x: 37, y: 5, width: 24, height: 12 },
      buttonPanel: { x: 71, y: 44, width: 12, height: 66 },
      wirePanel: { x: 72, y: 60, width: 18, height: 25 },
      inspectionPlaque: { x: 30, y: 25, width: 15, height: 25 },
      safetyPoster: { x: 3, y: 45, width: 15, height: 22 },
      incidentPoster: { x: 0, y: 0, width: 9, height: 42 },
      roofHatch: { x: 22, y: 0, width: 52, height: 10 },
      noticeBoard: { x: 36, y: 34, width: 18, height: 17 },
    },
    zoom_content: { x: 15, y: 15, width: 70, height: 70 },
  };

  constructor(
    @Inject(DOCUMENT) document: Document,
    router: Router,
    dialog: MatDialog,
    textService: EscapeRoomTextService
  ) {
    super(document, router, dialog, textService);
    this.currentBackgroundUrl = imagePaths.outside;
  }

  protected override onInit(): void {
    this.preloadImages(Object.values(imagePaths));
  }

  override updateBackground(): void {
    if (this.activeDialogue) return;

    if (this.currentState === GameState.OutsideElevator) {
      this.currentBackgroundUrl = imagePaths.outside;
      return;
    }
    if (this.currentState === GameState.EnterElevator) {
      this.currentBackgroundUrl = imagePaths.outside;
      return;
    }

    if (this.isLightsOff) {
      this.currentBackgroundUrl = imagePaths.inside_lights_off;
      return;
    }

    switch (this.currentView) {
      case 'outside':
        this.currentBackgroundUrl = imagePaths.outside;
        break;
      case 'floorIndicator':
        this.currentBackgroundUrl = imagePaths.zoom_floor_indicator;
        break;
      case 'roofLamp':
        this.currentBackgroundUrl = imagePaths.zoom_roof_lamp;
        break;
      case 'buttonPanel':
        this.currentBackgroundUrl = imagePaths.zoom_button_panel;
        break;
      case 'wirePanel':
        this.currentBackgroundUrl = imagePaths.zoom_wire_panel;
        break;
      case 'inspectionPlaque':
        this.currentBackgroundUrl = imagePaths.zoom_inspection_plaque;
        break;
      case 'safetyPoster':
        this.currentBackgroundUrl = imagePaths.zoom_safety_poster;
        break;
      case 'incidentPoster':
        this.currentBackgroundUrl = imagePaths.zoom_incident_poster;
        break;
      case 'roofHatch':
        this.currentBackgroundUrl = imagePaths.zoom_roof_hatch;
        break;
      case 'noticeBoard':
        this.currentBackgroundUrl = imagePaths.zoom_notice_board;
        break;
      default:
        this.currentBackgroundUrl = imagePaths.inside_lights_on;
        break;
    }
  }

  protected override onHintRequested(): void { this.isHintDialogue = true; }

  protected override getHintText(): string {
    switch (this.currentState) {
      case GameState.OutsideElevator: return this.t('hints.outsideElevator');
      case GameState.EnterElevator: return this.t('hints.enterElevator');
      case GameState.PressFloorButton: return this.t('hints.pressFloor');
      case GameState.GatherInfo: return this.t('hints.gatherInfo');
      case GameState.GatherInfoComplete:
      case GameState.AlternativesRevealed:
      case GameState.OutcomesRevealed:
      case GameState.EvaluationComplete: return this.t('hints.clickNoticeBoard');
      case GameState.IdentifyAlternatives: return this.t('hints.identifyAlternatives');
      case GameState.IdentifyOutcomes: return this.t('hints.identifyOutcomes');
      case GameState.EvaluateAlternatives: return this.t('hints.evaluateAlternatives');
      case GameState.SelectAlternative: return this.t('hints.selectAlternative');
      case GameState.ReviewOutcome: return this.t('hints.reviewOutcome');
      default: return this.t('hints.default');
    }
  }

  protected override onIntroPopupClosed(): void {
    this.currentState = GameState.OutsideElevator;
    this.currentView = 'outside';
    this.updateBackground();
  }

  protected override resetZoomState(): void {
    this.currentView = 'main';
  }

  // --- Alternatives data (built from i18n) ---

  get alternatives(): Alternative[] {
    return ALTERNATIVE_KEYS.map(key => ({
      id: key,
      label: this.t(`alternatives.${key}.label`),
      outcomes: [0, 1, 2].map(i => this.t(`alternatives.${key}.outcomes.${i}`)).filter(o => o),
      risk: this.t(`alternatives.${key}.risk`) as CriteriaMatch,
      timeCost: this.t(`alternatives.${key}.timeCost`) as CriteriaMatch,
      resourceUse: this.t(`alternatives.${key}.resourceUse`) as CriteriaMatch,
      control: this.t(`alternatives.${key}.control`) as CriteriaMatch,
      tooltips: {
        risk: this.t(`alternatives.${key}.tooltips.risk`),
        timeCost: this.t(`alternatives.${key}.tooltips.timeCost`),
        resourceUse: this.t(`alternatives.${key}.tooltips.resourceUse`),
        control: this.t(`alternatives.${key}.tooltips.control`),
      },
      actualOutcome: {
        summary: this.t(`alternatives.${key}.actualOutcome.summary`),
        sound: this.t(`alternatives.${key}.actualOutcome.sound`),
      }
    }));
  }

  get sortedAlternatives(): Alternative[] {
    if (!this.activeCriterion) return this.alternatives;
    const order: Record<CriteriaMatch, number> = { 'match': 0, 'neutral': 1, 'mismatch': 2 };
    return [...this.alternatives].sort((a, b) => {
      const aVal = order[this.getCriterionValue(a, this.activeCriterion!)] ?? 1;
      const bVal = order[this.getCriterionValue(b, this.activeCriterion!)] ?? 1;
      return aVal - bVal;
    });
  }

  getCriterionValue(alt: Alternative, criterion: string): CriteriaMatch {
    switch (criterion) {
      case 'risk': return alt.risk;
      case 'timeCost': return alt.timeCost;
      case 'resourceUse': return alt.resourceUse;
      case 'control': return alt.control;
      default: return 'neutral';
    }
  }

  getCriterionIcon(match: CriteriaMatch): string {
    switch (match) {
      case 'match': return 'check_circle';
      case 'neutral': return 'warning';
      case 'mismatch': return 'cancel';
    }
  }

  getCriterionClass(match: CriteriaMatch): string {
    return `criteria-${match}`;
  }

  getTooltipForAlternative(alt: Alternative): string {
    if (!this.activeCriterion) return '';
    return alt.tooltips[this.activeCriterion] || '';
  }

  // --- Hotspot clicks ---

  override onHotspotClick(target: string): void {
    this.showHints = false;
    if (this.activeDialogue) return;

    // Outside elevator: call button — opens doors and enters directly
    if (target === 'callButton' && this.currentState === GameState.OutsideElevator) {
      this.playSound('step.wav');
      this.playSound('door-open.wav');
      this.currentState = GameState.PressFloorButton;
      this.currentView = 'main';
      this.currentBackgroundUrl = imagePaths.inside_facing_panel;
      return;
    }

    // Outside elevator: enter (kept for backward compat if state is EnterElevator)
    if (target === 'elevatorInside' && this.currentState === GameState.EnterElevator) {
      this.playSound('step.wav');
      this.currentState = GameState.PressFloorButton;
      this.currentView = 'main';
      this.currentBackgroundUrl = imagePaths.inside_facing_panel;
      return;
    }

    // Inside elevator: press floor button
    if (target === 'buttonPanel' && this.currentState === GameState.PressFloorButton) {
      this.playSound('step.wav');
      this.startElevatorSequence();
      return;
    }

    // Gather info: click objects
    if (this.currentState === GameState.GatherInfo && this.infoItems.includes(target)) {
      this.handleInfoItemClick(target);
      return;
    }

    // Click within zoomed info-item view
    if (target === 'infoZoomContent' && this.currentState === GameState.GatherInfo && this.currentView !== 'main' && this.currentView !== 'outside') {
      this.onInfoZoomClick();
      return;
    }

    // Notice board click for flowchart phases
    if (target === 'noticeBoard' && (
      this.currentState === GameState.GatherInfoComplete ||
      this.currentState === GameState.IdentifyAlternatives ||
      this.currentState === GameState.AlternativesRevealed ||
      this.currentState === GameState.IdentifyOutcomes ||
      this.currentState === GameState.OutcomesRevealed ||
      this.currentState === GameState.EvaluateAlternatives ||
      this.currentState === GameState.EvaluationComplete ||
      this.currentState === GameState.SelectAlternative
    )) {
      this.currentView = 'noticeBoard';
      this.updateBackground();

      if (this.currentState === GameState.GatherInfoComplete) {
        this.currentState = GameState.IdentifyAlternatives;
      }
      return;
    }
  }

  // --- Elevator entry sequence ---

  private startElevatorSequence(): void {
    this.currentState = GameState.ElevatorMoving;
    this.currentBackgroundUrl = imagePaths.inside_facing_doors;
    this.playSound('door-open.wav');
    this.isElevatorMoving = true;

    // Simulate floor changes: 1 -> 2 -> 3 -> 4 -> 5
    this.currentFloor = 1;
    const floorInterval = setInterval(() => {
      this.currentFloor++;
      if (this.currentFloor >= 5) {
        clearInterval(floorInterval);
        this.triggerMalfunction();
      }
    }, 800);
  }

  private triggerMalfunction(): void {
    this.isElevatorMoving = false;
    this.currentState = GameState.ElevatorMalfunction;
    this.playSound('error-buzz.mp3');

    // Lights off briefly
    this.isLightsOff = true;
    this.currentBackgroundUrl = imagePaths.inside_lights_off;

    setTimeout(() => {
      this.isLightsOff = false;
      this.currentBackgroundUrl = imagePaths.inside_lights_on;
      this.currentState = GameState.StalledDialogue1;
      this.showDialogue({
        id: 'system_stalled1',
        character: this.playerSpeaker,
        text: this.t('systemDialogues.elevatorStalled')
      });
    }, 1500);
  }

  // --- Gather Info ---

  private handleInfoItemClick(target: string): void {
    if (target === 'incidentPoster') {
      this.incidentPosterClicks++;
      if (this.incidentPosterClicks === 1) {
        this.zoomToLocation(target, this.hotspots.main, () => {
          this.currentView = target as ViewState;
          this.updateBackground();
          this.resetZoom(true);
          // Player must click hotspot within zoomed view
        }, 2.5);
      } else if (this.incidentPosterClicks === 2) {
        this.isIncidentReset = true;
        this.showDialogue({
          id: `info_${target}_reset`,
          character: this.playerSpeaker,
          text: this.t('items.incidentPoster.dialogue2')
        });
      }
      return;
    }

    // Special cases: inspection plaque and safety poster show overlay
    if (target === 'inspectionPlaque' || target === 'safetyPoster') {
      this.zoomToLocation(target, this.hotspots.main, () => {
        this.currentView = target as ViewState;
        this.updateBackground();
        this.resetZoom(true);
        // Player must click hotspot within zoomed view
      }, 2.5);
      return;
    }

    // All other info items: zoom in, player must click hotspot
    this.zoomToLocation(target, this.hotspots.main, () => {
      this.currentView = target as ViewState;
      this.updateBackground();
      this.resetZoom(true);
      // Player must click hotspot within zoomed view
    }, 2.5);
  }

  /** Handle click within any zoomed info-item view */
  onInfoZoomClick(): void {
    const target = this.currentView;
    if (!target || target === 'main' || target === 'outside') return;

    this.playSound('paper-rustle.wav');

    if (target === 'incidentPoster') {
      this.clickedInfoItems.add(target);
      this.showDialogue({
        id: `info_${target}`,
        character: this.playerSpeaker,
        text: this.t('items.incidentPoster.dialogue1')
      });
      return;
    }

    if (target === 'inspectionPlaque' || target === 'safetyPoster') {
      this.clickedInfoItems.add(target);
      if (target === 'inspectionPlaque') {
        this.isInspectionPlaqueVisible = true;
        this.showDialogue({
          id: `info_${target}`,
          character: this.playerSpeaker,
          text: this.t('items.inspectionPlaque.dialogue')
        });
      } else {
        this.isSafetyPosterVisible = true;
      }
      this.checkGatherInfoComplete();
      return;
    }

    // All other info items
    this.clickedInfoItems.add(target);
    const dialogueKey = `items.${target}.dialogue`;
    this.showDialogue({
      id: `info_${target}`,
      character: this.playerSpeaker,
      text: this.t(dialogueKey)
    });
    this.checkGatherInfoComplete();
  }

  private checkGatherInfoComplete(): void {
    if (this.infoItems.every(item => this.clickedInfoItems.has(item))) {
      // All items clicked — will transition on next dialogue dismiss
    }
  }

  closeInspectionPlaque(): void {
    this.isInspectionPlaqueVisible = false;
    this.checkGatherInfoComplete();
  }

  closeSafetyPoster(): void {
    this.isSafetyPosterVisible = false;
    this.checkGatherInfoComplete();
  }

  // --- Flowchart: Identify Alternatives ---

  revealAlternative(altId: string): void {
    this.revealedAlternatives.add(altId);
    this.playSound('success-chime.wav');
    if (this.revealedAlternatives.size === ALTERNATIVE_KEYS.length) {
      this.currentState = GameState.AlternativesRevealed;
      setTimeout(() => {
        this.showDialogue({
          id: 'system_alternativesRevealed',
          character: this.playerSpeaker,
          text: this.t('systemDialogues.alternativesRevealed')
        });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }
  }

  // --- Flowchart: Identify Outcomes ---

  revealOutcome(altId: string, outcomeIndex: number): void {
    const key = `${altId}_${outcomeIndex}`;
    this.revealedOutcomes.add(key);
    this.playSound('success-chime.wav');

    // Check if all outcomes revealed
    const totalOutcomes = this.alternatives.reduce((sum, alt) => sum + alt.outcomes.length, 0);
    if (this.revealedOutcomes.size === totalOutcomes) {
      this.currentState = GameState.OutcomesRevealed;
      setTimeout(() => {
        this.showDialogue({
          id: 'system_outcomesRevealed',
          character: this.playerSpeaker,
          text: this.t('systemDialogues.outcomesRevealed')
        });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }
  }

  isOutcomeRevealed(altId: string, outcomeIndex: number): boolean {
    return this.revealedOutcomes.has(`${altId}_${outcomeIndex}`);
  }

  // --- Flowchart: Evaluate Alternatives ---

  selectCriterion(criterion: string): void {
    this.activeCriterion = criterion;
    this.clickedCriteria.add(criterion);

    if (this.clickedCriteria.size === CRITERIA_KEYS.length && this.currentState === GameState.EvaluateAlternatives) {
      this.currentState = GameState.EvaluationComplete;
      setTimeout(() => {
        this.showDialogue({
          id: 'system_evaluationComplete',
          character: this.playerSpeaker,
          text: this.t('systemDialogues.evaluationComplete')
        });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }
  }

  // --- Flowchart: Select Alternative ---

  selectAlternative(alt: Alternative): void {
    if (this.currentState !== GameState.SelectAlternative) return;
    this.chosenAlternative = alt;
    this.selectedAlternativeId = alt.id;
    this.currentState = GameState.TakeAction;

    // Play outcome animation
    this.currentView = 'main';
    this.currentBackgroundUrl = imagePaths.escape_outcome;

    this.showDialogue({
      id: 'system_takeAction',
      character: this.playerSpeaker,
      text: alt.actualOutcome.summary
    });

    // Record a scoring placeholder — the "puzzle" here is the whole process.
    // Score: 100% for completing the decision-making process (no wrong/right).
    this.recordPuzzleScore('Decision Process', 0, false);
  }

  // --- Dialogue dismiss ---

  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;

    if (this.isHintDialogue) {
      this.isHintDialogue = false;
      this.showHintPulse();
      this.updateBackground();
      return;
    }
    this.showHints = false;

    // Stalled dialogue chain
    if (id === 'system_stalled1') {
      this.showDialogue({
        id: 'system_stalled2',
        character: this.playerSpeaker,
        text: this.t('systemDialogues.whatNow')
      });
    }
    else if (id === 'system_stalled2') {
      this.currentState = GameState.GatherInfo;
      this.currentView = 'main';
      this.updateBackground();
    }

    // Info item dialogues — return to main view
    else if (id?.startsWith('info_')) {
      if (this.currentView !== 'main') {
        this.currentView = 'main';
      }
      this.updateBackground();

      // Check if all items are now clicked
      if (this.infoItems.every(item => this.clickedInfoItems.has(item)) && this.currentState === GameState.GatherInfo) {
        this.currentState = GameState.GatherInfoComplete;
        setTimeout(() => {
          this.showDialogue({
            id: 'system_allInfoGathered',
            character: this.playerSpeaker,
            text: this.t('systemDialogues.allInfoGathered')
          });
        }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
      }
    }

    // All info gathered -> poster falls
    else if (id === 'system_allInfoGathered') {
      this.showDialogue({
        id: 'system_posterFalls',
        character: this.playerSpeaker,
        text: this.t('systemDialogues.posterFalls')
      });
    }
    else if (id === 'system_posterFalls') {
      // Player can now click notice board
      this.updateBackground();
    }

    // Alternatives revealed
    else if (id === 'system_alternativesRevealed') {
      this.currentState = GameState.IdentifyOutcomes;
      this.updateBackground();
    }

    // Outcomes revealed
    else if (id === 'system_outcomesRevealed') {
      this.currentState = GameState.EvaluateAlternatives;
      this.updateBackground();
    }

    // Evaluation complete
    else if (id === 'system_evaluationComplete') {
      this.currentState = GameState.SelectAlternative;
      this.showDialogue({
        id: 'system_chooseAlternative',
        character: this.playerSpeaker,
        text: this.t('systemDialogues.chooseAlternative')
      });
    }
    else if (id === 'system_chooseAlternative') {
      // Player can now click alternatives
      this.updateBackground();
    }

    // Take action outcome shown
    else if (id === 'system_takeAction') {
      this.currentState = GameState.ReviewOutcome;
      this.updateBackground();
    }

    // Review outcome finished
    else if (id === 'system_reviewComplete') {
      this.currentState = GameState.Completion;
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
    }

    else {
      this.updateBackground();
    }
  }

  handleDialogueDismiss(): void { this.dismissDialogue(); }

  // --- Skip Puzzle Methods ---

  skipDecisionProcess(): void {
    this.recordPuzzleScore('Decision Process', 99, true);
    this.currentState = GameState.Completion;
    this.currentView = 'main';
    this.finalizeAndReportScore();
    this.isGameCompleteOverlayVisible = true;
  }

  // --- Review Outcome ---

  finishReview(): void {
    this.currentState = GameState.Completion;
    this.finalizeAndReportScore();
    this.isGameCompleteOverlayVisible = true;
  }

  // --- goBack override ---

  override goBack(): void {
    this.isAnimating = true;
    this.showHints = false;
    this.playSound('zoom-out.wav');
    this.resetZoom();
    setTimeout(() => {
      this.isInspectionPlaqueVisible = false;
      this.isSafetyPosterVisible = false;
      this.currentView = 'main';
      this.updateBackground();
      this.isAnimating = false;
    }, ESCAPE_ROOM_TIMING.zoomOutDelay);
  }
}

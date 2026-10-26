import { Component, Inject, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { EscapeRoomBaseComponent } from '../shared/escape-room/escape-room-base.component';
import { EscapeRoomTextService } from '../shared/escape-room/escape-room-text.service';
import { fadeInOut } from '../shared/escape-room/escape-room.animations';
import { Dialogue, EscapeRoomConfig, CharacterImageMap, ESCAPE_ROOM_TIMING } from '../shared/escape-room/escape-room.interfaces';

import { RoomHelpButtonComponent } from '../shared/escape-room/room-help-button/room-help-button.component';
// --- Game State ---
enum GameState {
  Intro,
  IntroSequence,      // Auto-zoom sequence: cable → boxes → puddle
  IdentifyRisks,      // Main exploration phase
  AllRisksFound,       // Transition dialogue
  RiskAssessment,      // Whiteboard: rate each risk
  ReviewAssessment,    // Review results
  Completion           // Door opens, exit
}

// --- Risk definitions with acceptable scoring ranges ---
interface RiskDefinition {
  id: string;
  hotspot: { x: number; y: number; width: number; height: number };
  zoomImage: string;
  sound?: string;
  animationClass?: string;
}

interface RiskAssessmentEntry {
  riskId: string;
  likelihood: number;
  impact: number;
}

interface ReviewEntry {
  riskId: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  correct: boolean;
  likelihoodFeedback: string;
  impactFeedback: string;
}

// Acceptable ranges for fuzzy scoring
const ACCEPTABLE_RANGES: { [riskId: string]: { likelihood: [number, number]; impact: [number, number] } } = {
  cable:               { likelihood: [2, 4], impact: [3, 5] },
  extinguisher:        { likelihood: [1, 3], impact: [4, 5] },
  ladder:              { likelihood: [3, 5], impact: [2, 4] },
  boxes:               { likelihood: [1, 4], impact: [1, 3] },
  puddle:              { likelihood: [3, 5], impact: [2, 4] },
  chemicals_unlabeled: { likelihood: [2, 4], impact: [3, 5] },
  chemicals_sunlight:  { likelihood: [1, 3], impact: [2, 4] },
  chemical_edge:       { likelihood: [2, 5], impact: [2, 4] },
  sandwich:            { likelihood: [1, 4], impact: [1, 3] },
  bucket:              { likelihood: [1, 4], impact: [1, 3] },
  gloves:              { likelihood: [2, 4], impact: [3, 5] },
};

const RISK_IDS = [
  'cable', 'extinguisher', 'ladder', 'boxes', 'puddle',
  'chemicals_unlabeled', 'chemicals_sunlight', 'chemical_edge',
  'sandwich', 'bucket', 'gloves'
];

const RED_HERRING_IDS = ['labels', 'fragile_box', 'taped_cable', 'door_sign', 'chair'];

const imagePaths = {
  base: '/assets/images/risk_management/janitor_closet.png',
  base_door_open: '/assets/images/risk_management/janitor_closet_door_open.png',
  zoom_cable: '/assets/images/risk_management/zoom_cable.png',
  zoom_extinguisher: '/assets/images/risk_management/zoom_extinguisher.png',
  zoom_ladder: '/assets/images/risk_management/zoom_ladder.png',
  zoom_boxes: '/assets/images/risk_management/zoom_boxes.png',
  zoom_puddle: '/assets/images/risk_management/zoom_puddle.png',
  zoom_chemicals: '/assets/images/risk_management/zoom_chemicals.png',
  zoom_desk: '/assets/images/risk_management/zoom_desk.png',
  zoom_bucket: '/assets/images/risk_management/zoom_bucket.png',
  zoom_gloves: '/assets/images/risk_management/zoom_gloves.png',
  zoom_whiteboard: '/assets/images/risk_management/zoom_whiteboard.png',
};

type ViewState = 'main' | 'cable' | 'extinguisher' | 'ladder' | 'boxes' | 'puddle'
  | 'chemicals' | 'desk' | 'bucket' | 'gloves' | 'whiteboard';

const roomConfig: EscapeRoomConfig = {
  roomId: 'risk-management',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: true,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
    selector: 'app-risk-management-module15',
    templateUrl: './risk-management-module15.component.html',
    styleUrl: './risk-management-module15.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule, RouterModule, MatDialogModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class RiskManagementModule15Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  // TrackBy functions
  trackById = (_: number, item: { id: string }) => item.id;
  trackByRiskId = (_: number, item: { riskId: string }) => item.riskId;
  trackByIndex = (index: number) => index;
  trackByKey = (_: number, item: { key: string }) => item.key;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'main';

  // Hint system
  public isHintDialogue: boolean = false;

  // --- Phase 2: Risk Identification ---
  public foundRisks: Set<string> = new Set();
  public dismissedRedHerrings: Set<string> = new Set();
  public activeThought: { id: string; text: string; isRisk: boolean } | null = null;
  public introSequenceStep: number = 0;

  // Hotspots for all clickable objects in main view
  public hotspots: { [key: string]: { x: number; y: number; width: number; height: number } } = {
    // Risks (positions matched to actual generated image)
    cable:               { x: 18, y: 0,  width: 28, height: 20 },
    extinguisher:        { x: 53, y: 28, width: 8,  height: 28 },
    ladder: { x: 59, y: 9, width: 19, height: 67 },
    boxes:               { x: 28, y: 12, width: 16, height: 52 },
    puddle:              { x: 38, y: 72, width: 22, height: 20 },
    chemicals_unlabeled: { x: 93, y: 35, width: 5, height: 16 },
    chemicals_sunlight:  { x: 4,  y: 18, width: 14, height: 20 },
    chemical_edge: { x: 92, y: 14, width: 5, height: 13 },
    sandwich:            { x: 5,  y: 48, width: 16, height: 14 },
    bucket:              { x: 80, y: 68, width: 16, height: 28 },
    gloves:              { x: 0,  y: 28, width: 14, height: 22 },
    // Red herrings
    labels:              { x: 76, y: 38, width: 10, height: 12 },
    fragile_box:         { x: 86, y: 48, width: 10, height: 12 },
    taped_cable:         { x: 28, y: 82, width: 26, height: 10 },
    door_sign:           { x: 40, y: 32, width: 10, height: 14 },
    chair:               { x: 20, y: 58, width: 18, height: 36 },
    // Whiteboard (only visible after all risks found). janitor_closet.png has no
    // whiteboard, so the template draws one (div.whiteboard-prop) at this rect on
    // the bare concrete wall above the glove rail; the same rect drives the zoom-in.
    whiteboard:          { x: 9,  y: 7,  width: 13, height: 17 },   // clear of the hint button (top-left chrome) and the window frame at x≈22%
    // Exit door
    exitDoor: { x: 43, y: 23, width: 12, height: 40 },
  };

  // Zoom-view hotspot for whiteboard — outlines the assessment table drawn in
  // zoom_whiteboard.png (title + grid at roughly x 35-62%, y 18-72%). It is a
  // visible dashed target now, so it must hug the table rather than the old
  // 15-85% box that ran past the board's right edge onto the wall.
  public whiteboardZoomHotspot = { x: 33, y: 15, width: 32, height: 59 };

  // --- Phase 3: Risk Assessment ---
  public assessments: RiskAssessmentEntry[] = [];
  public currentAssessmentIndex: number = 0;
  public assessmentWrongAttempts: number = 0;
  public assessmentTotalWrong: number = 0;
  public assessmentWasRevealed: boolean = false;

  // --- Phase 4: Review ---
  public reviewEntries: ReviewEntry[] = [];
  public correctCount: number = 0;
  public incorrectCount: number = 0;
  public generalFeedback: string = '';

  // No characters in this room
  override get characterImages(): CharacterImageMap { return {}; }

  protected override canInteractWithCharacter(): boolean { return false; }

  public override get isMainViewActive(): boolean {
    return this.currentView === 'main';
  }

  public override get isQuizActive(): boolean {
    return this.currentState === GameState.RiskAssessment ||
      this.currentState === GameState.ReviewAssessment;
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
    // Initialize assessment entries for all risks
    this.assessments = RISK_IDS.map(id => ({ riskId: id, likelihood: 0, impact: 0 }));
  }

  // --- Background ---
  override updateBackground(): void {
    if (this.activeDialogue) return;

    if (this.isDoorOpen) {
      this.currentBackgroundUrl = imagePaths.base_door_open;
      return;
    }

    switch (this.currentView) {
      case 'cable': this.currentBackgroundUrl = imagePaths.zoom_cable; break;
      case 'extinguisher': this.currentBackgroundUrl = imagePaths.zoom_extinguisher; break;
      case 'ladder': this.currentBackgroundUrl = imagePaths.zoom_ladder; break;
      case 'boxes': this.currentBackgroundUrl = imagePaths.zoom_boxes; break;
      case 'puddle': this.currentBackgroundUrl = imagePaths.zoom_puddle; break;
      case 'chemicals': this.currentBackgroundUrl = imagePaths.zoom_chemicals; break;
      case 'desk': this.currentBackgroundUrl = imagePaths.zoom_desk; break;
      case 'bucket': this.currentBackgroundUrl = imagePaths.zoom_bucket; break;
      case 'gloves': this.currentBackgroundUrl = imagePaths.zoom_gloves; break;
      case 'whiteboard': this.currentBackgroundUrl = imagePaths.zoom_whiteboard; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  // --- Hints ---
  protected override onHintRequested(): void {
    this.isHintDialogue = true;
  }

  protected override getHintText(): string {
    if (this.currentState === GameState.Intro || this.currentState === GameState.IntroSequence) {
      return this.t('hints.intro');
    } else if (this.currentState === GameState.IdentifyRisks) {
      return this.t('hints.identifying') + ` (${this.foundRisks.size}/${RISK_IDS.length} ${this.t('ui.risksFound').toLowerCase()})`;
    } else if (this.currentState === GameState.AllRisksFound) {
      // Main view: point at the (CSS-drawn) whiteboard on the left wall.
      // Zoomed view: point at the assessment table on the board.
      return this.currentView === 'whiteboard'
        ? this.t('hints.whiteboardZoom')
        : this.t('hints.allRisksFound');
    } else if (this.currentState === GameState.RiskAssessment) {
      return this.t('hints.assessment');
    } else if (this.currentState === GameState.ReviewAssessment) {
      return this.t('hints.review');
    } else if (this.currentState === GameState.Completion) {
      return this.t('hints.completion');
    }
    return this.t('hints.default');
  }

  // --- Intro popup closed → start intro sequence ---
  protected override onIntroPopupClosed(): void {
    this.currentState = GameState.IntroSequence;
    this.introSequenceStep = 0;
    this.showDialogue({ character: '', text: this.t('dialogues.enterRoom'), id: 'intro_1' });
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

    // Whiteboard — only active after all risks found
    if (target === 'whiteboard' && this.currentState === GameState.AllRisksFound) {
      this.zoomToLocation('whiteboard', this.hotspots, () => {
        this.currentView = 'whiteboard';
        this.updateBackground();
        this.resetZoom(true);
        // Player must click hotspot within zoomed view to start assessment
      }, 2.5);
      return;
    }

    // --- Click within whiteboard zoomed view to start assessment ---
    if (this.currentView === 'whiteboard' && target === 'whiteboardContent' && this.currentState === GameState.AllRisksFound) {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: '', text: this.t('dialogues.startAssessment'), id: 'start_assessment' });
      return;
    }

    // Risk identification phase
    if (this.currentState === GameState.IdentifyRisks && this.currentView === 'main') {
      // Check if it's a risk
      if (RISK_IDS.includes(target) && !this.foundRisks.has(target)) {
        this.handleRiskClick(target);
        return;
      }
      // Check if it's a red herring
      if (RED_HERRING_IDS.includes(target) && !this.dismissedRedHerrings.has(target)) {
        this.handleRedHerringClick(target);
        return;
      }
      // Already found risk — zoom to view it again
      if (RISK_IDS.includes(target) && this.foundRisks.has(target)) {
        this.zoomToRiskView(target);
        return;
      }
    }
  }

  private handleRiskClick(riskId: string): void {
    // Save immediately so the click is never lost if the user navigates away mid-animation.
    this.foundRisks.add(riskId);
    const zoomView = this.getZoomViewForRisk(riskId);
    this.zoomToLocation(riskId, this.hotspots, () => {
      this.currentView = zoomView;
      this.updateBackground();
      this.resetZoom(true);

      // Play risk-specific sound
      const sound = this.getSoundForRisk(riskId);
      if (sound) this.playSound(sound);

      // Show thought bubble after delay so player sees the zoomed image
      setTimeout(() => {
        this.playSound('success-chime.wav');
        this.activeThought = {
          id: riskId,
          text: this.t(`risks.${riskId}.thought`),
          isRisk: true
        };
      }, 800);
    }, 2.5);
  }

  private handleRedHerringClick(herringId: string): void {
    // For red herrings, show thought without zooming into a different view
    this.playSound('paper-rustle.wav');
    this.dismissedRedHerrings.add(herringId);
    this.activeThought = {
      id: herringId,
      text: this.t(`redHerrings.${herringId}.thought`),
      isRisk: false
    };
  }

  private zoomToRiskView(riskId: string): void {
    const zoomView = this.getZoomViewForRisk(riskId);
    this.zoomToLocation(riskId, this.hotspots, () => {
      this.currentView = zoomView;
      this.updateBackground();
      this.resetZoom(true);
    }, 2.5);
  }

  private getZoomViewForRisk(riskId: string): ViewState {
    switch (riskId) {
      case 'cable': return 'cable';
      case 'extinguisher': return 'extinguisher';
      case 'ladder': return 'ladder';
      case 'boxes': return 'boxes';
      case 'puddle': return 'puddle';
      case 'chemicals_unlabeled':
      case 'chemicals_sunlight':
      case 'chemical_edge': return 'chemicals';
      case 'sandwich':
      case 'gloves': return 'desk';
      case 'bucket': return 'bucket';
      default: return 'main';
    }
  }

  private getSoundForRisk(riskId: string): string | null {
    switch (riskId) {
      case 'cable': return 'error-buzz.mp3';   // electrical sound
      case 'ladder': return 'step.wav';         // creaking
      case 'boxes': return 'step.wav';          // box sliding
      case 'puddle': return 'step.wav';         // drip
      case 'chemical_edge': return 'step.wav';  // glass clink
      case 'sandwich': return 'paper-rustle.wav';
      case 'bucket': return 'step.wav';         // water sloshing
      case 'gloves': return 'paper-rustle.wav'; // fabric tearing
      default: return null;
    }
  }

  // Dismiss thought bubble
  dismissThought(): void {
    this.activeThought = null;

    // If we're in a zoomed view, go back
    if (this.currentView !== 'main') {
      this.goBack();
    }

    // Check if all risks found
    if (this.foundRisks.size === RISK_IDS.length && this.currentState === GameState.IdentifyRisks) {
      this.recordPuzzleScore('Risk Identification', this.getTotalRedHerringDismissals(), false);
      setTimeout(() => {
        this.showDialogue({ character: '', text: this.t('dialogues.allRisksFound'), id: 'all_risks_found' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }
  }

  private getTotalRedHerringDismissals(): number {
    // No wrong attempts for identification — red herrings are not "wrong"
    // Score based on how many red herrings they clicked (each one counts as a wrong attempt)
    return 0; // Give full score for identification
  }

  // --- Dialogue Dismissal ---
  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;
    this.updateBackground();

    if (this.isHintDialogue) {
      this.isHintDialogue = false;
      this.showHintPulse();
      return;
    }

    this.showHints = false;

    // Intro sequence
    if (id === 'intro_1') {
      this.showDialogue({ character: '', text: this.t('dialogues.realizeCloset'), id: 'intro_2' });
    }
    else if (id === 'intro_2') {
      this.showDialogue({ character: '', text: this.t('dialogues.unsafeRoom'), id: 'intro_3' });
    }
    else if (id === 'intro_3') {
      // Start zoom sequence: cable
      this.introSequenceStep = 1;
      this.zoomToLocation('cable', this.hotspots, () => {
        this.currentView = 'cable';
        this.updateBackground();
        this.resetZoom(true);
        this.playSound('error-buzz.mp3');
        setTimeout(() => {
          this.showDialogue({ character: '', text: this.t('dialogues.zoomCable'), id: 'zoom_cable' });
        }, 800);
      }, 2.5);
    }
    else if (id === 'zoom_cable') {
      this.goBack();
      setTimeout(() => {
        // Zoom to boxes
        this.zoomToLocation('boxes', this.hotspots, () => {
          this.currentView = 'boxes';
          this.updateBackground();
          this.resetZoom(true);
          this.playSound('step.wav');
          setTimeout(() => {
            this.showDialogue({ character: '', text: this.t('dialogues.zoomBoxes'), id: 'zoom_boxes' });
          }, 800);
        }, 2.5);
      }, ESCAPE_ROOM_TIMING.zoomOutDelay + 200);
    }
    else if (id === 'zoom_boxes') {
      this.goBack();
      setTimeout(() => {
        // Zoom to puddle
        this.zoomToLocation('puddle', this.hotspots, () => {
          this.currentView = 'puddle';
          this.updateBackground();
          this.resetZoom(true);
          this.playSound('step.wav');
          setTimeout(() => {
            this.showDialogue({ character: '', text: this.t('dialogues.zoomPuddle'), id: 'zoom_puddle' });
          }, 800);
        }, 2.5);
      }, ESCAPE_ROOM_TIMING.zoomOutDelay + 200);
    }
    else if (id === 'zoom_puddle') {
      this.goBack();
      setTimeout(() => {
        this.showDialogue({ character: '', text: this.t('dialogues.uncoverRisks'), id: 'start_identifying' });
      }, ESCAPE_ROOM_TIMING.zoomOutDelay + 200);
    }
    else if (id === 'start_identifying') {
      this.currentState = GameState.IdentifyRisks;
    }
    // All risks found → transition
    else if (id === 'all_risks_found') {
      this.currentState = GameState.AllRisksFound;
    }
    // Start assessment
    else if (id === 'start_assessment') {
      this.currentState = GameState.RiskAssessment;
      this.currentAssessmentIndex = 0;
    }
    // Assessment complete
    else if (id === 'assessment_complete') {
      this.computeReview();
      this.currentState = GameState.ReviewAssessment;
    }
    // Congratulations
    else if (id === 'congratulations') {
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.playDoorSound();
      this.updateBackground();
    }
  }

  handleDialogueDismiss(): void {
    this.dismissDialogue();
  }

  // --- View Reset ---
  protected override resetZoomState(): void {
    this.currentView = 'main';
  }

  // --- Risk Assessment (Phase 3) ---

  get currentAssessment(): RiskAssessmentEntry {
    return this.assessments[this.currentAssessmentIndex];
  }

  get currentRiskId(): string {
    return this.assessments[this.currentAssessmentIndex]?.riskId || '';
  }

  setLikelihood(value: number): void {
    this.assessments[this.currentAssessmentIndex].likelihood = value;
  }

  setImpact(value: number): void {
    this.assessments[this.currentAssessmentIndex].impact = value;
  }

  get currentRiskScore(): number {
    const a = this.assessments[this.currentAssessmentIndex];
    return a.likelihood * a.impact;
  }

  get canGoNext(): boolean {
    const a = this.assessments[this.currentAssessmentIndex];
    return a.likelihood > 0 && a.impact > 0;
  }

  get canSubmitAssessment(): boolean {
    return this.assessments.every(a => a.likelihood > 0 && a.impact > 0);
  }

  nextRisk(): void {
    if (this.currentAssessmentIndex < this.assessments.length - 1) {
      this.currentAssessmentIndex++;
    }
  }

  prevRisk(): void {
    if (this.currentAssessmentIndex > 0) {
      this.currentAssessmentIndex--;
    }
  }

  goToRisk(index: number): void {
    if (index >= 0 && index < this.assessments.length) {
      this.currentAssessmentIndex = index;
    }
  }

  submitAssessment(): void {
    if (!this.canSubmitAssessment) return;

    // Compute how many risks were correctly assessed
    let wrongCount = 0;
    for (const entry of this.assessments) {
      const range = ACCEPTABLE_RANGES[entry.riskId];
      if (!range) continue;
      const likelihoodOk = entry.likelihood >= range.likelihood[0] && entry.likelihood <= range.likelihood[1];
      const impactOk = entry.impact >= range.impact[0] && entry.impact <= range.impact[1];
      if (!likelihoodOk || !impactOk) wrongCount++;
    }

    this.assessmentTotalWrong = wrongCount;
    this.recordPuzzleScore('Risk Assessment', wrongCount, false);

    this.showDialogue({ character: '', text: this.t('dialogues.assessmentComplete'), id: 'assessment_complete' });
  }

  // --- Review (Phase 4) ---

  private computeReview(): void {
    this.reviewEntries = [];
    let tooHighCount = 0;
    let tooLowCount = 0;

    for (const entry of this.assessments) {
      const range = ACCEPTABLE_RANGES[entry.riskId];
      if (!range) continue;

      const likelihoodOk = entry.likelihood >= range.likelihood[0] && entry.likelihood <= range.likelihood[1];
      const impactOk = entry.impact >= range.impact[0] && entry.impact <= range.impact[1];
      const correct = likelihoodOk && impactOk;

      let likelihoodFeedback = '';
      let impactFeedback = '';

      if (!likelihoodOk) {
        if (entry.likelihood < range.likelihood[0]) {
          likelihoodFeedback = this.t('review.likelihoodTooLow');
          tooLowCount++;
        } else {
          likelihoodFeedback = this.t('review.likelihoodTooHigh');
          tooHighCount++;
        }
      }
      if (!impactOk) {
        if (entry.impact < range.impact[0]) {
          impactFeedback = this.t('review.impactTooLow');
          tooLowCount++;
        } else {
          impactFeedback = this.t('review.impactTooHigh');
          tooHighCount++;
        }
      }

      this.reviewEntries.push({
        riskId: entry.riskId,
        likelihood: entry.likelihood,
        impact: entry.impact,
        riskScore: entry.likelihood * entry.impact,
        correct,
        likelihoodFeedback,
        impactFeedback,
      });
    }

    this.correctCount = this.reviewEntries.filter(r => r.correct).length;
    this.incorrectCount = this.reviewEntries.filter(r => !r.correct).length;

    // General feedback
    if (this.incorrectCount === 0) {
      this.generalFeedback = this.t('review.perfectScore');
    } else if (tooHighCount > tooLowCount + 2) {
      this.generalFeedback = this.t('review.generalFeedbackHigh');
    } else if (tooLowCount > tooHighCount + 2) {
      this.generalFeedback = this.t('review.generalFeedbackLow');
    } else {
      this.generalFeedback = this.t('review.goodScore');
    }
  }

  get correctReviewEntries(): ReviewEntry[] {
    return this.reviewEntries.filter(r => r.correct);
  }

  get incorrectReviewEntries(): ReviewEntry[] {
    return this.reviewEntries.filter(r => !r.correct);
  }

  endAssessment(): void {
    this.currentView = 'main';
    this.updateBackground();
    this.showDialogue({ character: '', text: this.t('dialogues.congratulations'), id: 'congratulations' });
  }

  // --- Helper: get all risk hotspot entries for template ---
  get riskHotspotEntries(): { id: string; hotspot: { x: number; y: number; width: number; height: number }; found: boolean }[] {
    return RISK_IDS.map(id => ({
      id,
      hotspot: this.hotspots[id],
      found: this.foundRisks.has(id),
    }));
  }

  get redHerringHotspotEntries(): { id: string; hotspot: { x: number; y: number; width: number; height: number }; dismissed: boolean }[] {
    return RED_HERRING_IDS.map(id => ({
      id,
      hotspot: this.hotspots[id],
      dismissed: this.dismissedRedHerrings.has(id),
    }));
  }

  // Scale values for risk assessment UI
  get scaleValues(): number[] {
    return [1, 2, 3, 4, 5];
  }

  // Risk score color helper
  getRiskScoreColor(score: number): string {
    if (score <= 5) return 'low-risk';
    if (score <= 12) return 'medium-risk';
    return 'high-risk';
  }

  // Skip puzzle methods
  skipIdentification(): void {
    // Mark all risks as found
    for (const id of RISK_IDS) {
      this.foundRisks.add(id);
    }
    this.recordPuzzleScore('Risk Identification', 99, true);
    this.currentState = GameState.AllRisksFound;
    this.puzzleFeedback = '';
  }

  skipAssessment(): void {
    this.recordPuzzleScore('Risk Assessment', 99, true);
    this.computeReview();
    this.currentState = GameState.ReviewAssessment;
    this.puzzleFeedback = '';
  }
}

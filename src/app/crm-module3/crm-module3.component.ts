import { Component, Inject, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EscapeRoomBaseComponent } from '../shared/escape-room/escape-room-base.component';
import { EscapeRoomTextService } from '../shared/escape-room/escape-room-text.service';
import { fadeInOut } from '../shared/escape-room/escape-room.animations';
import { Dialogue, EscapeRoomConfig, CharacterImageMap, ESCAPE_ROOM_TIMING } from '../shared/escape-room/escape-room.interfaces';

import { RoomHelpButtonComponent } from '../shared/escape-room/room-help-button/room-help-button.component';
enum GameState {
  Intro,
  Explore,
  Puzzle1_ComplaintCall,
  Puzzle1Complete,
  Puzzle2_CustomerRegistry,
  Puzzle2Complete,
  Puzzle3_FeedbackSurvey,
  Puzzle3Complete,
  AllComplete,
  Completion
}

interface CustomerDataEntry {
  id: string;
  type: string;
  content: string;
  action: 'keep' | 'erase';
  hint: string;
}

interface CustomerFile {
  name: string;
  type: string;
  consent: string;
  consentDetails: string;
  data: CustomerDataEntry[];
  explanation: {
    title: string;
    keepTitle: string;
    keepContent: string;
    eraseTitle: string;
    eraseContent: string;
  };
}

interface SurveyQuestion {
  correct: string;
  wrong: string;
  explanation: string;
}

interface SurveyQuestionDisplay {
  optionA: string;
  optionB: string;
  correctIsA: boolean;
}

const imagePaths = {
  base_empty: '/assets/images/crm/customer_service_dept.png',
  base: '/assets/images/crm/customer_service_dept_default.png',
  base_door_open: '/assets/images/crm/customer_service_dept_door_open.png',
  peter_hover: '/assets/images/crm/peter_hover.png',
  peter_talking: '/assets/images/crm/peter_talking.png',
  peter_hover_door_open: '/assets/images/crm/peter_hover_door_open.png',
  simone_hover: '/assets/images/crm/simone_hover.png',
  simone_talking: '/assets/images/crm/simone_talking.png',
  simone_hover_door_open: '/assets/images/crm/simone_hover_door_open.png',
  zoom_cabinet: '/assets/images/crm/zoom_cabinet.png',
  zoom_whiteboard: '/assets/images/crm/zoom_whiteboard.png',
  phone_call: '/assets/images/crm/phone_call.png',
};

type ViewState = 'main' | 'cabinet' | 'whiteboard';

const roomConfig: EscapeRoomConfig = {
  roomId: 'crm',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
    selector: 'app-crm-module3',
    templateUrl: './crm-module3.component.html',
    styleUrl: './crm-module3.component.scss',
    imports: [RoomHelpButtonComponent,
        CommonModule, MatCardModule, MatButtonModule, MatIconModule,
        RouterModule, MatDialogModule, DragDropModule,
        MatProgressBarModule, MatTooltipModule
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class CrmModule3Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;
  trackByKey = (_: number, item: { key: string }) => item.key;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'main';

  public isHintDialogue: boolean = false;

  // Track which puzzles are completed
  puzzle1Done: boolean = false;
  puzzle2Done: boolean = false;
  puzzle3Done: boolean = false;

  hotspots = {
    main: {
      peter: { x: 9, y: 42, width: 20, height: 50 },
      simone: { x: 54, y: 30, width: 18, height: 51 },
      cabinet: { x: 26, y: 46, width: 7, height: 14 },
      whiteboard: { x: 47, y: 28, width: 16, height: 16 },
      rubberDuck: { x: 47, y: 57, width: 3, height: 5 },
      coffeeMachine: { x: 65, y: 28, width: 8, height: 30 },
      notebook: { x: 8, y: 42, width: 5, height: 6 },
      deerPoster: { x: 14, y: 24, width: 6, height: 15 },
      naturePoster: { x: 25, y: 26, width: 4, height: 13 },
      bearPoster: { x: 33, y: 28, width: 3, height: 11 },
      exitDoor: { x: 0, y: 19, width: 6, height: 58 },
    }
  };

  // =====================================
  // PUZZLE 1: Customer Complaint Call
  // =====================================
  callStage: number = 0;
  callMood: number = 0; // starts neutral (0), range roughly -5 to +6
  callHoldCount: number = 0;
  callFailed: boolean = false;
  callSuccess: boolean = false;
  callShowingBranch: boolean = false;
  callBranchType: 'good' | 'neutral' | 'bad' | null = null;
  callBranchStep: number = 0; // 0=customer reply, 1=user follow-up
  callOnHold: boolean = false;
  callShowHoldResponse: boolean = false;
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;

  // =====================================
  // PUZZLE 2: Customer Registry
  // =====================================
  currentFileIndex: number = 0;
  customerFiles: CustomerFile[] = [];
  keepColumn: CustomerDataEntry[] = [];
  eraseColumn: CustomerDataEntry[] = [];
  unsortedColumn: CustomerDataEntry[] = [];
  registryFeedback: string = '';
  registryShowExplanation: boolean = false;
  showKeepDetails: boolean = false;
  showEraseDetails: boolean = false;
  showPrivacyGuidelines: boolean = false;
  privacyGuidelineStep: number = 0;
  lockedCorrectIds: Set<string> = new Set();
  registryAllFilesComplete: boolean = false;
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;

  // =====================================
  // PUZZLE 3: Feedback Survey
  // =====================================
  surveyQuestions: SurveyQuestionDisplay[] = [];
  currentSurveyQuestion: number = 0;
  surveyAnswers: boolean[] = []; // true = correct choice, false = wrong
  surveyComplete: boolean = false;
  surveySelectedQuestions: string[] = [];
  surveyCorrectQuestions: string[] = [];
  surveyExplanations: string[] = [];
  expandedExplanationIndex: number = -1;
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  override get characterImages(): CharacterImageMap {
    return {
      peter: { hover: imagePaths.peter_hover, hoverDoorOpen: imagePaths.peter_hover_door_open },
      simone: { hover: imagePaths.simone_hover, hoverDoorOpen: imagePaths.simone_hover_door_open },
    };
  }

  protected override canInteractWithCharacter(): boolean {
    return this.currentView === 'main' && !this.activeDialogue && !this.isAnimating;
  }

  public override get isMainViewActive(): boolean {
    return this.currentView === 'main';
  }

  public override get isQuizActive(): boolean {
    return this.currentState === GameState.Puzzle1_ComplaintCall ||
      this.currentState === GameState.Puzzle2_CustomerRegistry ||
      this.currentState === GameState.Puzzle3_FeedbackSurvey;
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

  override updateBackground(): void {
    if (this.activeDialogue) return;
    if (this.currentState === GameState.Puzzle1_ComplaintCall) {
      this.currentBackgroundUrl = imagePaths.phone_call;
      return;
    }
    if (this.isQuizActive) { this.currentBackgroundUrl = imagePaths.base; return; }
    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }
    switch (this.currentView) {
      case 'cabinet': this.currentBackgroundUrl = imagePaths.zoom_cabinet; break;
      case 'whiteboard': this.currentBackgroundUrl = imagePaths.zoom_whiteboard; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  protected override onHintRequested(): void { this.isHintDialogue = true; }

  protected override getHintText(): string {
    if (this.currentState === GameState.Explore) {
      if (!this.puzzle1Done) return this.t('hints.talkToPeter');
      if (!this.puzzle2Done) return this.t('hints.findCabinet');
      if (!this.puzzle3Done) return this.t('hints.talkToSimone');
    }
    if (this.currentState === GameState.Puzzle1Complete) return this.t('hints.findCabinet');
    if (this.currentState === GameState.Puzzle2Complete) return this.t('hints.talkToSimone');
    if (this.currentState === GameState.Puzzle3Complete) return this.t('hints.completion');
    if (this.currentState === GameState.AllComplete) return this.t('hints.completion');
    if (this.isQuizActive) return this.t('hints.puzzleInProgress');
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

    if (target === 'peter') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.peter_talking;
      this.handlePeterInteraction();
      return;
    }

    if (target === 'simone') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.simone_talking;
      this.handleSimoneInteraction();
      return;
    }

    // Interactive objects (always accessible)
    if (target === 'rubberDuck') {
      this.playSound('hint-sound.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('interactiveObjects.rubberDuck.text'), id: 'obj_rubberDuck' });
      return;
    }
    if (target === 'coffeeMachine') {
      this.playSound('hint-sound.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('interactiveObjects.coffeeMachine.text'), id: 'obj_coffeeMachine' });
      return;
    }
    if (target === 'notebook') {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('interactiveObjects.notebook.text'), id: 'obj_notebook' });
      return;
    }
    if (target === 'deerPoster') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('interactiveObjects.deerPoster.text'), id: 'obj_deerPoster' });
      return;
    }
    if (target === 'naturePoster') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('interactiveObjects.naturePoster.text'), id: 'obj_naturePoster' });
      return;
    }
    if (target === 'bearPoster') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('interactiveObjects.bearPoster.text'), id: 'obj_bearPoster' });
      return;
    }

    // Filing cabinet
    if (target === 'cabinet' && this.currentState === GameState.Explore && !this.puzzle2Done) {
      this.playSound('step.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.cabinetBurst'), id: 'system_cabinetBurst' });
      return;
    }
  }

  handlePeterInteraction(): void {
    const name = this.t('characters.peter.name');
    if (this.currentState === GameState.Explore && !this.puzzle1Done) {
      this.showDialogue({ character: name, text: this.t('characters.peter.dialogues.intro1'), id: 'peter_intro1' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.peter.dialogues.default'), id: 'peter_default' });
    }
  }

  handleSimoneInteraction(): void {
    const name = this.t('characters.simone.name');
    if (this.currentState === GameState.Explore && !this.puzzle3Done) {
      this.showDialogue({ character: name, text: this.t('characters.simone.dialogues.intro1'), id: 'simone_intro1' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.simone.dialogues.default'), id: 'simone_default' });
    }
  }

  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;
    this.activeDialogue = null;
    this.updateBackground();

    if (this.isHintDialogue) { this.isHintDialogue = false; this.showHintPulse(); }
    else { this.showHints = false; }

    const peterName = this.t('characters.peter.name');
    const simoneName = this.t('characters.simone.name');

    // Intro flow
    if (id === 'system_selfTalk') { this.currentState = GameState.Explore; }

    // Peter / Puzzle 1 flow
    else if (id === 'peter_intro1') {
      this.currentBackgroundUrl = imagePaths.peter_talking;
      this.showDialogue({ character: peterName, text: this.t('characters.peter.dialogues.intro2'), id: 'peter_intro2' });
    }
    else if (id === 'peter_intro2') {
      this.currentBackgroundUrl = imagePaths.peter_talking;
      this.showDialogue({ character: peterName, text: this.t('characters.peter.dialogues.intro3'), id: 'peter_intro3' });
    }
    else if (id === 'peter_intro3') {
      this.startComplaintCall();
    }

    // Cabinet / Puzzle 2 flow
    else if (id === 'system_cabinetBurst') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.cabinetSort'), id: 'system_cabinetSort' });
    }
    else if (id === 'system_cabinetSort') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.guidelinesPrompt'), id: 'system_guidelinesPrompt' });
    }
    else if (id === 'system_guidelinesPrompt') {
      // Show the guidelines choice overlay — handled via guidelinesPromptVisible
      this.guidelinesPromptVisible = true;
    }

    // Simone / Puzzle 3 flow
    else if (id === 'simone_intro1') {
      this.currentBackgroundUrl = imagePaths.simone_talking;
      this.showDialogue({ character: simoneName, text: this.t('characters.simone.dialogues.intro2'), id: 'simone_intro2' });
    }
    else if (id === 'simone_intro2') {
      this.currentBackgroundUrl = imagePaths.simone_talking;
      this.showDialogue({ character: simoneName, text: this.t('characters.simone.dialogues.intro3'), id: 'simone_intro3' });
    }
    else if (id === 'simone_intro3') {
      this.startFeedbackSurvey();
    }

    // Puzzle complete transitions
    else if (id === 'system_puzzle1Complete') {
      this.puzzle1Done = true;
      this.currentState = GameState.Explore;
      this.updateBackground();
      this.checkAllPuzzlesComplete();
    }
    else if (id === 'system_puzzle2Complete') {
      this.puzzle2Done = true;
      this.currentState = GameState.Explore;
      this.updateBackground();
      this.checkAllPuzzlesComplete();
    }
    else if (id === 'system_puzzle3Complete') {
      this.puzzle3Done = true;
      this.currentState = GameState.Explore;
      this.updateBackground();
      this.checkAllPuzzlesComplete();
    }

    // All complete
    else if (id === 'system_allComplete') {
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.playDoorSound();
      this.updateBackground();
    }

    // Interactive object dismissals — just return to explore
  }

  handleDialogueDismiss(): void { this.dismissDialogue(); }

  protected override onIntroPopupClosed(): void {
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.selfTalk'), id: 'system_selfTalk' });
  }

  protected override resetZoomState(): void { this.currentView = 'main'; }

  checkAllPuzzlesComplete(): void {
    if (this.puzzle1Done && this.puzzle2Done && this.puzzle3Done) {
      this.currentState = GameState.AllComplete;
      setTimeout(() => {
        this.showDialogue({
          character: this.playerSpeaker,
          text: this.t('completion.message'),
          id: 'system_allComplete'
        });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    }
  }

  // --- Skip Puzzle Methods ---

  skipPuzzle1(): void {
    this.recordPuzzleScore('Complaint Call', 99, true);
    this.puzzle1Done = true;
    this.currentState = GameState.Explore;
    this.updateBackground();
    this.checkAllPuzzlesComplete();
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Customer Registry', 99, true);
    this.puzzle2Done = true;
    this.currentState = GameState.Explore;
    this.updateBackground();
    this.checkAllPuzzlesComplete();
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Feedback Survey', 99, true);
    this.puzzle3Done = true;
    this.currentState = GameState.Explore;
    this.updateBackground();
    this.checkAllPuzzlesComplete();
  }

  // =====================================
  // PUZZLE 1: Customer Complaint Call
  // =====================================

  guidelinesPromptVisible: boolean = false;

  startComplaintCall(): void {
    this.currentState = GameState.Puzzle1_ComplaintCall;
    this.callStage = 0;
    this.callMood = 0;
    this.callHoldCount = 0;
    this.callFailed = false;
    this.callSuccess = false;
    this.callShowingBranch = false;
    this.callBranchType = null;
    this.callBranchStep = 0;
    this.callOnHold = false;
    this.callShowHoldResponse = false;
    this.updateBackground();
  }

  get callCustomerStatement(): string {
    return this.t('puzzles.complaintCall.stages.' + this.callStage + '.customerStatement');
  }

  get callOptions(): { key: string; text: string }[] {
    return [
      { key: 'good', text: this.t('puzzles.complaintCall.stages.' + this.callStage + '.options.good') },
      { key: 'neutral', text: this.t('puzzles.complaintCall.stages.' + this.callStage + '.options.neutral') },
      { key: 'bad', text: this.t('puzzles.complaintCall.stages.' + this.callStage + '.options.bad') }
    ];
  }

  get moodPercentage(): number {
    // Map mood from range [-5, 6] to [0, 100] for progress bar
    return Math.max(0, Math.min(100, ((this.callMood + 5) / 11) * 100));
  }

  get moodColor(): string {
    if (this.moodPercentage > 60) return 'primary';
    if (this.moodPercentage > 30) return 'accent';
    return 'warn';
  }

  selectCallOption(key: string): void {
    const moodDelta = key === 'good' ? 1 : key === 'neutral' ? 0 : -1;
    this.callMood += moodDelta;
    if (key === 'bad') this.puzzle1TotalWrong++;

    this.callBranchType = key as 'good' | 'neutral' | 'bad';
    this.callBranchStep = 0;
    this.callShowingBranch = true;

    // Check for mood failure
    if (this.callMood <= -5) {
      this.triggerCallFailure();
    }
  }

  advanceCallBranch(): void {
    if (this.callBranchStep === 0) {
      // Show user follow-up
      this.callBranchStep = 1;
    } else {
      // Move to next stage
      this.callShowingBranch = false;
      this.callBranchType = null;
      this.callBranchStep = 0;
      this.callStage++;

      if (this.callStage >= 6) {
        this.triggerCallSuccess();
      }
    }
  }

  putOnHold(): void {
    if (this.callShowingBranch || this.callOnHold) return;
    this.callHoldCount++;
    this.callMood -= 2;

    if (this.callHoldCount >= 2) {
      this.triggerCallFailure();
      return;
    }

    this.callOnHold = true;
    this.callShowHoldResponse = true;
    this.playSound('hint-sound.wav'); // placeholder for hold music
  }

  returnFromHold(): void {
    this.callOnHold = false;
    this.callShowHoldResponse = false;

    if (this.callMood <= -5) {
      this.triggerCallFailure();
    }
  }

  triggerCallFailure(): void {
    this.callFailed = true;
    this.puzzle1TotalWrong += 3; // heavy penalty for failure
    this.playSound('error-buzz.mp3');
  }

  triggerCallSuccess(): void {
    this.callSuccess = true;
    this.playSound('success-chime.wav');
  }

  retryCall(): void {
    this.startComplaintCall();
  }

  endCall(): void {
    this.recordPuzzleScore('Complaint Call', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
    this.currentState = GameState.Puzzle1Complete;
    setTimeout(() => {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.complaintCall.success.message'), id: 'system_puzzle1Complete' });
    }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
  }

  // =====================================
  // PUZZLE 2: Customer Registry
  // =====================================

  startRegistry(readGuidelines: boolean): void {
    this.guidelinesPromptVisible = false;
    if (readGuidelines) {
      this.showPrivacyGuidelines = true;
      this.privacyGuidelineStep = 0;
    } else {
      this.initRegistryPuzzle();
    }
  }

  nextGuidelinePage(): void {
    this.privacyGuidelineStep++;
    if (this.privacyGuidelineStep >= 5) {
      this.showPrivacyGuidelines = false;
      this.initRegistryPuzzle();
    }
  }

  initRegistryPuzzle(): void {
    this.currentState = GameState.Puzzle2_CustomerRegistry;
    this.currentFileIndex = 0;
    this.customerFiles = this.buildCustomerFiles();
    this.registryAllFilesComplete = false;
    this.registryShowExplanation = false;
    this.loadCurrentFile();
    this.updateBackground();
  }

  buildCustomerFiles(): CustomerFile[] {
    const files: CustomerFile[] = [];
    for (let i = 0; i < 5; i++) {
      const prefix = 'puzzles.customerRegistry.customers.' + i;
      const dataCount = this.getDataCount(i);
      const dataEntries: CustomerDataEntry[] = [];
      for (let j = 0; j < dataCount; j++) {
        dataEntries.push({
          id: 'file' + i + '_data' + j,
          type: this.t(prefix + '.data.' + j + '.type'),
          content: this.t(prefix + '.data.' + j + '.content'),
          action: this.t(prefix + '.data.' + j + '.action') as 'keep' | 'erase',
          hint: this.t(prefix + '.data.' + j + '.hint')
        });
      }
      files.push({
        name: this.t(prefix + '.name'),
        type: this.t(prefix + '.type'),
        consent: this.t(prefix + '.consent'),
        consentDetails: this.t(prefix + '.consentDetails'),
        data: dataEntries,
        explanation: {
          title: this.t(prefix + '.explanation.title'),
          keepTitle: this.t(prefix + '.explanation.keepTitle'),
          keepContent: this.t(prefix + '.explanation.keepContent'),
          eraseTitle: this.t(prefix + '.explanation.eraseTitle'),
          eraseContent: this.t(prefix + '.explanation.eraseContent')
        }
      });
    }
    return files;
  }

  getDataCount(fileIndex: number): number {
    const counts = [15, 12, 13, 8, 13];
    return counts[fileIndex];
  }

  loadCurrentFile(): void {
    if (this.currentFileIndex >= this.customerFiles.length) {
      this.registryAllFilesComplete = true;
      return;
    }
    const file = this.customerFiles[this.currentFileIndex];
    this.unsortedColumn = [...file.data].sort(() => Math.random() - 0.5);
    this.keepColumn = [];
    this.eraseColumn = [];
    this.registryFeedback = '';
    this.registryShowExplanation = false;
    this.showKeepDetails = false;
    this.showEraseDetails = false;
    this.lockedCorrectIds = new Set();
  }

  get currentCustomerFile(): CustomerFile | null {
    if (this.currentFileIndex < this.customerFiles.length) {
      return this.customerFiles[this.currentFileIndex];
    }
    return null;
  }

  onRegistryDrop(event: CdkDragDrop<CustomerDataEntry[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const item = event.previousContainer.data[event.previousIndex];
      if (this.lockedCorrectIds.has(item.id)) return; // locked items can't be moved
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
  }

  canDragItem(item: CustomerDataEntry): boolean {
    return !this.lockedCorrectIds.has(item.id);
  }

  saveRegistryEdits(): void {
    if (this.unsortedColumn.length > 0) {
      this.registryFeedback = this.t('ui.sortAllBeforeSave');
      return;
    }

    const file = this.customerFiles[this.currentFileIndex];
    let allCorrect = true;
    const wrongItems: CustomerDataEntry[] = [];

    // Check keep column
    for (const item of this.keepColumn) {
      if (item.action === 'keep') {
        this.lockedCorrectIds.add(item.id);
      } else {
        allCorrect = false;
        wrongItems.push(item);
      }
    }

    // Check erase column
    for (const item of this.eraseColumn) {
      if (item.action === 'erase') {
        this.lockedCorrectIds.add(item.id);
      } else {
        allCorrect = false;
        wrongItems.push(item);
      }
    }

    if (allCorrect) {
      this.playSound('success-chime.wav');
      this.registryShowExplanation = true;
      this.registryFeedback = '';
    } else {
      this.playSound('error-buzz.mp3');
      this.puzzle2TotalWrong++;
      // Move wrong items back to unsorted
      const wrongIds = new Set(wrongItems.map(w => w.id));
      this.keepColumn = this.keepColumn.filter(i => !wrongIds.has(i.id));
      this.eraseColumn = this.eraseColumn.filter(i => !wrongIds.has(i.id));
      this.unsortedColumn = [...this.unsortedColumn, ...wrongItems].sort(() => Math.random() - 0.5);
      this.registryFeedback = wrongItems.map(w => w.type + ': ' + w.hint).join('\n');
    }
  }

  nextCustomerFile(): void {
    this.currentFileIndex++;
    if (this.currentFileIndex >= this.customerFiles.length) {
      this.registryAllFilesComplete = true;
    } else {
      this.loadCurrentFile();
    }
  }

  closeRegistry(): void {
    this.recordPuzzleScore('Customer Registry', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
    this.currentState = GameState.Puzzle2Complete;
    setTimeout(() => {
      this.showDialogue({
        character: this.playerSpeaker,
        text: this.t('puzzles.customerRegistry.completion.title'),
        id: 'system_puzzle2Complete'
      });
    }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
  }

  // =====================================
  // PUZZLE 3: Feedback Survey
  // =====================================

  startFeedbackSurvey(): void {
    this.currentState = GameState.Puzzle3_FeedbackSurvey;
    this.currentSurveyQuestion = 0;
    this.surveyAnswers = [];
    this.surveySelectedQuestions = [];
    this.surveyCorrectQuestions = [];
    this.surveyExplanations = [];
    this.surveyComplete = false;
    this.expandedExplanationIndex = -1;

    // Build shuffled question display (randomize left/right position)
    this.surveyQuestions = [];
    for (let i = 0; i < 9; i++) {
      const correct = this.t('puzzles.feedbackSurvey.questions.' + i + '.correct');
      const wrong = this.t('puzzles.feedbackSurvey.questions.' + i + '.wrong');
      const correctIsA = Math.random() > 0.5;
      this.surveyQuestions.push({
        optionA: correctIsA ? correct : wrong,
        optionB: correctIsA ? wrong : correct,
        correctIsA
      });
      this.surveyCorrectQuestions.push(correct);
      this.surveyExplanations.push(this.t('puzzles.feedbackSurvey.questions.' + i + '.explanation'));
    }
    this.updateBackground();
  }

  selectSurveyOption(isA: boolean): void {
    const q = this.surveyQuestions[this.currentSurveyQuestion];
    const isCorrect = isA === q.correctIsA;
    this.surveyAnswers.push(isCorrect);
    this.surveySelectedQuestions.push(isA ? q.optionA : q.optionB);

    if (!isCorrect) {
      this.puzzle3TotalWrong++;
    }

    this.currentSurveyQuestion++;
    if (this.currentSurveyQuestion >= 9) {
      this.surveyComplete = true;
      this.playSound('success-chime.wav');
    }
  }

  toggleExplanation(index: number): void {
    this.expandedExplanationIndex = this.expandedExplanationIndex === index ? -1 : index;
  }

  closeSurvey(): void {
    this.recordPuzzleScore('Feedback Survey', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
    this.currentState = GameState.Puzzle3Complete;
    setTimeout(() => {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.feedbackSurvey.resultTitle'), id: 'system_puzzle3Complete' });
    }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
  }
}

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
  Phase1_Start,
  Phase1_Conversation,
  Phase1_BilalExit,
  Phase2_FaxSound,
  Phase2_Transcript,
  Phase3_Preparation,
  Phase3_SpreadsheetViewed,
  Phase3_HourglassViewed,
  Phase3_FolderViewed,
  Phase3_PostersViewed,
  Phase3_AllPrepDone,
  Phase4_BilalReturns,
  Phase4_Conversation,
  Completion
}

const imagePaths = {
  base: '/assets/images/negotiation_skills/interview_room_default.png',
  base_door_open: '/assets/images/negotiation_skills/interview_room_door_open.png',
  bilal_hover: '/assets/images/negotiation_skills/bilal_hover.png',
  bilal_talking: '/assets/images/negotiation_skills/bilal_talking.png',
  bilal_hover_door_open: '/assets/images/negotiation_skills/bilal_hover_door_open.png',
  zoom_fax: '/assets/images/negotiation_skills/zoom_fax.png',
  zoom_laptop: '/assets/images/negotiation_skills/zoom_laptop.png',
  zoom_hourglass: '/assets/images/negotiation_skills/zoom_hourglass.png',
  zoom_folder: '/assets/images/negotiation_skills/zoom_folder.png',
  zoom_posters: '/assets/images/negotiation_skills/zoom_posters.png',
  zoom_whiteboard: '/assets/images/negotiation_skills/zoom_whiteboard.png',
};

type ViewState = 'main' | 'fax' | 'laptop' | 'hourglass' | 'folder' | 'posters';

const roomConfig: EscapeRoomConfig = {
  roomId: 'negotiation-skills',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
    selector: 'app-negotiation-skills-module11',
    templateUrl: './negotiation-skills-module11.component.html',
    styleUrl: './negotiation-skills-module11.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class NegotiationSkillsModule11Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;
  trackByKey = (_: number, item: { key: string }) => item.key;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'main';

  // Hint system
  public isHintDialogue: boolean = false;

  // --- Phase 1: Unprepared Negotiation ---
  public phase1Step: number = 0; // 0-9 for Bilal's 10 statements
  public showPhase1Options: boolean = false;
  public bilalPresent: boolean = false; // Bilal in room

  // --- Phase 2: Transcript Analysis ---
  public isTranscriptVisible: boolean = false;
  public reflectedPhrases: Set<string> = new Set();
  public transcriptPhraseIds: string[] = ['1', '2', '3', '4', '5'];
  public activeThought: { id: string; text: string } | null = null;

  // Scoring for transcript analysis (Phase 2)
  public transcriptWrongAttempts: number = 0;
  public transcriptWasRevealed: boolean = false;

  // --- Phase 3: Preparation ---
  public hasViewedSpreadsheet: boolean = false;
  public hasViewedHourglass: boolean = false;
  public hasViewedFolder: boolean = false;
  public hasViewedPosters: boolean = false;

  public isSpreadsheetVisible: boolean = false;
  public isHourglassReflectionVisible: boolean = false;
  public isFolderVisible: boolean = false;
  public isPostersVisible: boolean = false;

  // Folder sub-documents
  public folderDocsViewed: Set<string> = new Set();
  public activeFolderDoc: string | null = null;

  // Posters sub-items
  public postersViewed: Set<string> = new Set();
  public activePoster: string | null = null;

  // --- Phase 4: Prepared Negotiation ---
  public phase4Step: number = 0; // 0-17 for 18 exchanges
  public showPhase4Options: boolean = false;
  public phase4BetterChoices: number = 0;
  public phase4TotalChoices: number = 0;
  public phase4WrongAttempts: number = 0;
  public phase4WasRevealed: boolean = false;

  // Phase 4 exchange map: step -> has options, Bilal dialogue key
  phase4Exchanges: { bilalKey: string; hasOptions: boolean; optionKeys?: [string, string] }[] = [
    { bilalKey: 'phase4_1', hasOptions: true, optionKeys: ['1a', '1b'] },
    { bilalKey: 'phase4_2', hasOptions: true, optionKeys: ['2a', '2b'] },
    { bilalKey: 'phase4_3', hasOptions: true, optionKeys: ['3a', '3b'] },
    { bilalKey: 'phase4_4', hasOptions: true, optionKeys: ['4a', '4b'] },
    { bilalKey: 'phase4_5', hasOptions: true, optionKeys: ['5a', '5b'] },
    { bilalKey: 'phase4_6', hasOptions: true, optionKeys: ['6a', '6b'] },
    { bilalKey: 'phase4_7', hasOptions: true, optionKeys: ['7a', '7b'] },
    { bilalKey: 'phase4_8', hasOptions: true, optionKeys: ['8a', '8b'] },
    { bilalKey: 'phase4_9', hasOptions: true, optionKeys: ['9a', '9b'] },
    { bilalKey: 'phase4_10', hasOptions: true, optionKeys: ['10a', '10b'] },
    { bilalKey: 'phase4_11', hasOptions: true, optionKeys: ['11a', '11b'] },
    { bilalKey: 'phase4_12', hasOptions: true, optionKeys: ['12a', '12b'] },
    { bilalKey: 'phase4_13', hasOptions: true, optionKeys: ['13a', '13b'] },
    { bilalKey: 'phase4_14', hasOptions: false },
    { bilalKey: 'phase4_15', hasOptions: false },
    { bilalKey: 'phase4_final', hasOptions: false },
  ];

  // Phase 1 exchange map
  phase1Exchanges: { bilalKey: string; hasOptions: boolean; optionKeys?: [string, string] }[] = [
    { bilalKey: 'phase1_1', hasOptions: true, optionKeys: ['1a', '1b'] },
    { bilalKey: 'phase1_2', hasOptions: true, optionKeys: ['2a', '2b'] },
    { bilalKey: 'phase1_3', hasOptions: true, optionKeys: ['3a', '3b'] },
    { bilalKey: 'phase1_4', hasOptions: true, optionKeys: ['4a', '4b'] },
    { bilalKey: 'phase1_5', hasOptions: true, optionKeys: ['5a', '5b'] },
    { bilalKey: 'phase1_6', hasOptions: true, optionKeys: ['6a', '6b'] },
    { bilalKey: 'phase1_7', hasOptions: true, optionKeys: ['7a', '7b'] },
    { bilalKey: 'phase1_8', hasOptions: true, optionKeys: ['8a', '8b'] },
    { bilalKey: 'phase1_9', hasOptions: false },
    { bilalKey: 'phase1_exit', hasOptions: false },
  ];

  get prepCompletedCount(): number {
    let count = 0;
    if (this.hasViewedSpreadsheet) count++;
    if (this.hasViewedHourglass) count++;
    if (this.hasViewedFolder) count++;
    if (this.hasViewedPosters) count++;
    return count;
  }

  get allPrepDone(): boolean {
    return this.hasViewedSpreadsheet && this.hasViewedHourglass && this.hasViewedFolder && this.hasViewedPosters;
  }

  get unreflectedCount(): number {
    return this.transcriptPhraseIds.length - this.reflectedPhrases.size;
  }

  // Hotspot positions (percentage-based)
  hotspots = {
    main: {
      bilal: { x: 18, y: 34, width: 20, height: 32 },
      fax: { x: 76, y: 38, width: 14, height: 32 },
      laptop: { x: 40, y: 48, width: 14, height: 14 },
      hourglass: { x: 67, y: 35, width: 3, height: 7 },
      folder: { x: 32, y: 58, width: 14, height: 12 },
      posters: { x: 9, y: 15, width: 12, height: 25 },
      exitDoor: { x: 23, y: 12, width: 15, height: 46 },
    },
    fax_zoom:       { content: { x: 15, y: 15, width: 70, height: 70 } },
    laptop_zoom:    { content: { x: 15, y: 15, width: 70, height: 70 } },
    hourglass_zoom: { content: { x: 15, y: 15, width: 70, height: 70 } },
    folder_zoom:    { content: { x: 15, y: 15, width: 70, height: 70 } },
    posters_zoom:   { content: { x: 15, y: 15, width: 70, height: 70 } },
  };

  override get characterImages(): CharacterImageMap {
    return {
      bilal: { hover: imagePaths.bilal_hover, hoverDoorOpen: imagePaths.bilal_hover_door_open },
    };
  }

  protected override canInteractWithCharacter(): boolean {
    return this.currentView === 'main' && !this.activeDialogue && !this.isAnimating;
  }

  public override get isMainViewActive(): boolean {
    return this.currentView === 'main';
  }

  public override get isQuizActive(): boolean {
    return this.isTranscriptVisible || this.isSpreadsheetVisible ||
      this.isHourglassReflectionVisible || this.isFolderVisible || this.isPostersVisible;
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

    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }

    switch (this.currentView) {
      case 'fax': this.currentBackgroundUrl = imagePaths.zoom_fax; break;
      case 'laptop': this.currentBackgroundUrl = imagePaths.zoom_laptop; break;
      case 'hourglass': this.currentBackgroundUrl = imagePaths.zoom_hourglass; break;
      case 'folder': this.currentBackgroundUrl = imagePaths.zoom_folder; break;
      case 'posters': this.currentBackgroundUrl = imagePaths.zoom_posters; break;
      default:
        if (this.bilalPresent) {
          this.currentBackgroundUrl = imagePaths.base;
        } else {
          this.currentBackgroundUrl = imagePaths.base;
        }
        break;
    }
  }

  // --- Hints ---
  protected override onHintRequested(): void {
    this.isHintDialogue = true;
  }

  protected override getHintText(): string {
    const state = this.currentState;
    if (state === GameState.Phase1_Start) return this.t('hints.phase1');
    if (state === GameState.Phase1_Conversation) return this.t('hints.phase1Conversation');
    if (state === GameState.Phase2_FaxSound) return this.t('hints.phase2Fax');
    if (state === GameState.Phase2_Transcript) return this.t('hints.phase2Transcript');
    if (state === GameState.Phase3_Preparation) {
      if (!this.hasViewedSpreadsheet) return this.t('hints.phase3Laptop');
      if (!this.hasViewedHourglass) return this.t('hints.phase3Hourglass');
      if (!this.hasViewedFolder) return this.t('hints.phase3Folder');
      if (!this.hasViewedPosters) return this.t('hints.phase3Posters');
      return this.t('hints.phase3General');
    }
    if (state === GameState.Phase3_AllPrepDone) return this.t('hints.phase4');
    if (state === GameState.Phase4_BilalReturns) return this.t('hints.phase4');
    if (state === GameState.Phase4_Conversation) return this.t('hints.phase4Conversation');
    if (state === GameState.Completion) return this.t('hints.completion');
    return this.t('hints.default');
  }

  /** Skip the current phase — parity with the other escape rooms so a stuck
   *  player can always advance. Advances one phase per call; completes from Phase 4. */
  skipPuzzle(): void {
    this.activeDialogue = null;
    this.currentView = 'main';
    const s = this.currentState;
    if (s < GameState.Phase2_FaxSound) {            // skip Phase 1 (Bilal conversation)
      this.currentState = GameState.Phase2_FaxSound;
    } else if (s < GameState.Phase3_Preparation) {  // skip Phase 2 (fax / transcript)
      this.currentState = GameState.Phase3_Preparation;
    } else if (s < GameState.Phase4_BilalReturns) { // skip Phase 3 (preparation items)
      this.bilalPresent = true;
      this.currentState = GameState.Phase4_BilalReturns;
    } else if (s < GameState.Completion) {          // skip Phase 4 (negotiation) → finish
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.finalizeAndReportScore();
      this.isGameCompleteOverlayVisible = true;
    }
    this.updateBackground();
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

    // Bilal interaction
    if (target === 'bilal' && this.bilalPresent) {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.bilal_talking;
      this.handleBilalInteraction();
      return;
    }

    // Phase 2: Fax machine
    if (target === 'fax' && this.currentState === GameState.Phase2_FaxSound) {
      this.playSound('paper-rustle.wav');
      this.zoomToLocation(target, this.hotspots.main, () => {
        this.currentView = 'fax';
        this.updateBackground();
        this.resetZoom(true);
      }, 2.5);
      return;
    }

    // Phase 3: Laptop (spreadsheet)
    if (target === 'laptop' && this.currentState === GameState.Phase3_Preparation && !this.hasViewedSpreadsheet) {
      this.zoomToLocation(target, this.hotspots.main, () => {
        this.currentView = 'laptop';
        this.updateBackground();
        this.resetZoom(true);
      }, 2.5);
      return;
    }

    // Phase 3: Hourglass
    if (target === 'hourglass' && this.currentState === GameState.Phase3_Preparation && !this.hasViewedHourglass) {
      this.zoomToLocation(target, this.hotspots.main, () => {
        this.currentView = 'hourglass';
        this.updateBackground();
        this.resetZoom(true);
      }, 2.5);
      return;
    }

    // Phase 3: Folder
    if (target === 'folder' && this.currentState === GameState.Phase3_Preparation && !this.hasViewedFolder) {
      this.zoomToLocation(target, this.hotspots.main, () => {
        this.currentView = 'folder';
        this.updateBackground();
        this.resetZoom(true);
      }, 2.5);
      return;
    }

    // Phase 3: Posters
    if (target === 'posters' && this.currentState === GameState.Phase3_Preparation && !this.hasViewedPosters) {
      this.zoomToLocation(target, this.hotspots.main, () => {
        this.currentView = 'posters';
        this.updateBackground();
        this.resetZoom(true);
      }, 2.5);
      return;
    }

    // --- Clicks within zoomed views ---
    if (this.currentView === 'fax' && target === 'faxContent' && this.currentState === GameState.Phase2_FaxSound) {
      this.playSound('paper-rustle.wav');
      this.showDialogue({ character: this.playerSpeaker, text: this.t('phase2.pickUpFax'), id: 'system_pickUpFax' });
      return;
    }
    if (this.currentView === 'laptop' && target === 'laptopContent' && this.currentState === GameState.Phase3_Preparation && !this.hasViewedSpreadsheet) {
      this.playSound('paper-rustle.wav');
      this.isSpreadsheetVisible = true;
      return;
    }
    if (this.currentView === 'hourglass' && target === 'hourglassContent' && this.currentState === GameState.Phase3_Preparation && !this.hasViewedHourglass) {
      this.playSound('paper-rustle.wav');
      this.isHourglassReflectionVisible = true;
      return;
    }
    if (this.currentView === 'folder' && target === 'folderContent' && this.currentState === GameState.Phase3_Preparation && !this.hasViewedFolder) {
      this.playSound('paper-rustle.wav');
      this.isFolderVisible = true;
      return;
    }
    if (this.currentView === 'posters' && target === 'postersContent' && this.currentState === GameState.Phase3_Preparation && !this.hasViewedPosters) {
      this.playSound('paper-rustle.wav');
      this.isPostersVisible = true;
      return;
    }
  }

  // --- Bilal Interaction ---
  handleBilalInteraction(): void {
    const state = this.currentState;
    const bilalName = this.t('characters.bilal.name');

    if (state === GameState.Phase1_Start) {
      // Start Phase 1 conversation
      this.currentState = GameState.Phase1_Conversation;
      this.phase1Step = 0;
      this.showPhase1BilalLine();
    }
    else if (state === GameState.Phase4_BilalReturns) {
      // Start Phase 4 conversation
      this.currentState = GameState.Phase4_Conversation;
      this.phase4Step = 0;
      this.showPhase4BilalLine();
    }
    else if (state === GameState.Completion) {
      this.showDialogue({ character: bilalName, text: this.t('characters.bilal.dialogues.completion'), id: 'bilal_completion' });
    }
    else {
      this.showDialogue({ character: bilalName, text: this.t('characters.bilal.dialogues.default'), id: 'bilal_default' });
    }
  }

  // --- Phase 1 Conversation ---
  showPhase1BilalLine(): void {
    const exchange = this.phase1Exchanges[this.phase1Step];
    if (!exchange) return;
    const bilalName = this.t('characters.bilal.name');
    this.currentBackgroundUrl = imagePaths.bilal_talking;
    this.showDialogue({
      character: bilalName,
      text: this.t('characters.bilal.dialogues.' + exchange.bilalKey),
      id: 'phase1_bilal_' + this.phase1Step
    });
  }

  selectPhase1Option(optionKey: string): void {
    this.showPhase1Options = false;
    // Player chose - advance to next Bilal line
    this.phase1Step++;
    if (this.phase1Step < this.phase1Exchanges.length) {
      this.showPhase1BilalLine();
    }
  }

  // --- Phase 4 Conversation ---
  showPhase4BilalLine(): void {
    const exchange = this.phase4Exchanges[this.phase4Step];
    if (!exchange) return;
    const bilalName = this.t('characters.bilal.name');
    this.currentBackgroundUrl = imagePaths.bilal_talking;
    this.showDialogue({
      character: bilalName,
      text: this.t('characters.bilal.dialogues.' + exchange.bilalKey),
      id: 'phase4_bilal_' + this.phase4Step
    });
  }

  selectPhase4Option(optionKey: string): void {
    this.showPhase4Options = false;
    this.phase4TotalChoices++;

    // 'a' options are "better" choices
    if (optionKey.endsWith('a')) {
      this.phase4BetterChoices++;
    }

    // Advance to next Bilal line
    this.phase4Step++;
    if (this.phase4Step < this.phase4Exchanges.length) {
      this.showPhase4BilalLine();
    }
  }

  // --- Transcript Interaction ---
  reflectOnPhrase(phraseId: string): void {
    if (this.reflectedPhrases.has(phraseId)) return;
    this.activeThought = {
      id: phraseId,
      text: this.t('phase2.phrases.' + phraseId + '.thought')
    };
  }

  dismissThought(): void {
    if (this.activeThought) {
      this.reflectedPhrases.add(this.activeThought.id);
      this.activeThought = null;

      if (this.reflectedPhrases.size === this.transcriptPhraseIds.length) {
        // All phrases reflected - score as puzzle
        this.recordPuzzleScore('Transcript Analysis', this.transcriptWrongAttempts, this.transcriptWasRevealed);
        setTimeout(() => {
          this.isTranscriptVisible = false;
          this.showDialogue({
            character: this.playerSpeaker,
            text: this.t('phase2.allPhrasesReflected'),
            id: 'system_allPhrasesReflected'
          });
        }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
      }
    }
  }

  closeTranscript(): void {
    this.isTranscriptVisible = false;
    this.activeThought = null;
    this.goBack();
  }

  // --- Phase 3 Close methods ---
  closeSpreadsheet(): void {
    this.isSpreadsheetVisible = false;
    this.hasViewedSpreadsheet = true;
    this.goBack();
    this.showDialogue({
      character: this.playerSpeaker,
      text: this.t('phase3.spreadsheet.conclusion'),
      id: 'system_spreadsheetDone'
    });
  }

  closeHourglass(): void {
    this.isHourglassReflectionVisible = false;
    this.hasViewedHourglass = true;
    this.goBack();
    this.showDialogue({
      character: this.playerSpeaker,
      text: this.t('phase3.hourglass.reflection'),
      id: 'system_hourglassDone'
    });
  }

  selectFolderDoc(docId: string): void {
    this.activeFolderDoc = docId;
  }

  closeFolderDoc(): void {
    if (this.activeFolderDoc) {
      this.folderDocsViewed.add(this.activeFolderDoc);
      this.activeFolderDoc = null;
      if (this.folderDocsViewed.size === 3) {
        this.isFolderVisible = false;
        this.hasViewedFolder = true;
        this.goBack();
        this.showDialogue({
          character: this.playerSpeaker,
          text: this.t('systemDialogues.prepItem'),
          id: 'system_folderDone'
        });
      }
    }
  }

  closeFolder(): void {
    this.isFolderVisible = false;
    this.activeFolderDoc = null;
    if (this.folderDocsViewed.size === 3) {
      this.hasViewedFolder = true;
    }
    this.goBack();
  }

  selectPoster(posterId: string): void {
    this.activePoster = posterId;
  }

  closePosterDetail(): void {
    if (this.activePoster) {
      this.postersViewed.add(this.activePoster);
      this.activePoster = null;
      if (this.postersViewed.size === 3) {
        this.isPostersVisible = false;
        this.hasViewedPosters = true;
        this.goBack();
        this.showDialogue({
          character: this.playerSpeaker,
          text: this.t('systemDialogues.prepItem'),
          id: 'system_postersDone'
        });
      }
    }
  }

  closePosters(): void {
    this.isPostersVisible = false;
    this.activePoster = null;
    if (this.postersViewed.size === 3) {
      this.hasViewedPosters = true;
    }
    this.goBack();
  }

  private checkAllPrepDone(): void {
    if (this.allPrepDone && this.currentState === GameState.Phase3_Preparation) {
      this.currentState = GameState.Phase3_AllPrepDone;
      this.showDialogue({
        character: this.playerSpeaker,
        text: this.t('phase3.allPrepComplete'),
        id: 'system_allPrepDone'
      });
    }
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
    } else {
      this.showHints = false;
    }

    // Intro → enter room self-talk → Phase1_Start
    if (id === 'system_enterRoom') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.bilalArrives'), id: 'system_bilalArrives' });
    }
    else if (id === 'system_bilalArrives') {
      this.bilalPresent = true;
      this.currentState = GameState.Phase1_Start;
      this.updateBackground();
    }

    // Phase 1 conversation flow
    else if (id?.startsWith('phase1_bilal_')) {
      const stepStr = id.replace('phase1_bilal_', '');
      const step = parseInt(stepStr, 10);
      const exchange = this.phase1Exchanges[step];

      if (exchange && exchange.hasOptions) {
        // Show player options
        this.showPhase1Options = true;
      } else {
        // No options - auto-advance
        this.phase1Step++;
        if (this.phase1Step < this.phase1Exchanges.length) {
          this.showPhase1BilalLine();
        } else {
          // End of Phase 1
          this.bilalPresent = false;
          this.currentState = GameState.Phase1_BilalExit;
          this.showDialogue({
            character: this.playerSpeaker,
            text: this.t('phase1.selfTalkAfter'),
            id: 'system_phase1SelfTalk'
          });
        }
      }
    }

    // After phase 1 self-talk → Phase 2 fax sound
    else if (id === 'system_phase1SelfTalk') {
      this.currentState = GameState.Phase2_FaxSound;
      this.playSound('paper-rustle.wav');
      this.showDialogue({
        character: this.playerSpeaker,
        text: this.t('phase2.faxSound'),
        id: 'system_faxSound'
      });
    }
    else if (id === 'system_faxSound') {
      // Player should click fax machine
    }

    // Pick up fax → show transcript
    else if (id === 'system_pickUpFax') {
      this.currentState = GameState.Phase2_Transcript;
      this.isTranscriptVisible = true;
    }

    // All phrases reflected → transition to phase 3
    else if (id === 'system_allPhrasesReflected') {
      this.showDialogue({
        character: this.playerSpeaker,
        text: this.t('phase2.transitionToPhase3'),
        id: 'system_transitionToPhase3'
      });
    }
    else if (id === 'system_transitionToPhase3') {
      this.currentView = 'main';
      this.currentState = GameState.Phase3_Preparation;
      this.showDialogue({
        character: this.playerSpeaker,
        text: this.t('systemDialogues.phase3Start'),
        id: 'system_phase3Start'
      });
    }
    else if (id === 'system_phase3Start') {
      // Player explores the room for preparation items
    }

    // Phase 3 item completion dialogues
    else if (id === 'system_spreadsheetDone' || id === 'system_hourglassDone' ||
             id === 'system_folderDone' || id === 'system_postersDone') {
      this.checkAllPrepDone();
    }

    // All prep done → Bilal returns
    else if (id === 'system_allPrepDone') {
      this.showDialogue({
        character: this.playerSpeaker,
        text: this.t('phase3.bilalReturns'),
        id: 'system_bilalReturns'
      });
    }
    else if (id === 'system_bilalReturns') {
      this.bilalPresent = true;
      this.currentState = GameState.Phase4_BilalReturns;
      this.showDialogue({
        character: this.playerSpeaker,
        text: this.t('systemDialogues.phase4Intro'),
        id: 'system_phase4Intro'
      });
    }
    else if (id === 'system_phase4Intro') {
      // Player clicks Bilal to start Phase 4
    }

    // Phase 4 conversation flow
    else if (id?.startsWith('phase4_bilal_')) {
      const stepStr = id.replace('phase4_bilal_', '');
      const step = parseInt(stepStr, 10);
      const exchange = this.phase4Exchanges[step];

      if (exchange && exchange.hasOptions) {
        this.showPhase4Options = true;
      } else {
        // No options - auto-advance
        this.phase4Step++;
        if (this.phase4Step < this.phase4Exchanges.length) {
          this.showPhase4BilalLine();
        } else {
          // End of Phase 4 - score the negotiation
          this.scorePhase4Negotiation();
          this.currentState = GameState.Completion;
          this.isDoorOpen = true;
          this.playDoorSound();
          this.updateBackground();
        }
      }
    }

    // Bilal default/completion - no state transition
    else if (id === 'bilal_default' || id === 'bilal_completion') {
      // No-op
    }
  }

  private scorePhase4Negotiation(): void {
    // Score based on how many "better" choices were made
    // 13 total choices in Phase 4; treat non-better choices as "wrong attempts"
    const wrongChoices = this.phase4TotalChoices - this.phase4BetterChoices;
    this.recordPuzzleScore('Prepared Negotiation', wrongChoices, false);
  }

  handleDialogueDismiss(): void {
    this.dismissDialogue();
  }

  // --- Intro popup closed ---
  protected override onIntroPopupClosed(): void {
    this.showDialogue({
      character: this.playerSpeaker,
      text: this.t('systemDialogues.enterRoom'),
      id: 'system_enterRoom'
    });
  }

  // --- UI Helpers ---
  protected override resetZoomState(): void {
    this.currentView = 'main';
  }
}

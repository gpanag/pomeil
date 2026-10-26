import { Component, Inject, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { EscapeRoomBaseComponent } from '../shared/escape-room/escape-room-base.component';
import { EscapeRoomTextService } from '../shared/escape-room/escape-room-text.service';
import { fadeInOut } from '../shared/escape-room/escape-room.animations';
import { Dialogue, EscapeRoomConfig, CharacterImageMap, ESCAPE_ROOM_TIMING } from '../shared/escape-room/escape-room.interfaces';

import { RoomHelpButtonComponent } from '../shared/escape-room/room-help-button/room-help-button.component';
enum GameState {
  Intro,
  // Puzzle 1: Initiate
  Initiate,
  Initiate_Npc1,
  Initiate_Npc2,
  Initiate_Npc2_Conv,
  Initiate_Edith,
  Initiate_Edith_Conv,
  Initiate_Complete,
  // Mirror transition
  FindMirror,
  MirrorReflection,
  // Puzzle 2: Build
  Build_Intro,
  Build_Conversation,
  Build_Complete,
  // Puzzle 3: Maintain
  Maintain_Intro,
  Maintain_Fredrik,
  Maintain_Contacts,
  Maintain_Complete,
  // Puzzle 4: Leverage
  Leverage_Intro,
  Leverage_Question,
  Leverage_Complete,
  // End
  Completion
}

const imagePaths = {
  base: '/assets/images/networking_skills/waiting_room_default.png',
  base_door_open: '/assets/images/networking_skills/waiting_room_door_open.png',
  npc1_hover: '/assets/images/networking_skills/npc1_hover.png',
  npc1_talking: '/assets/images/networking_skills/npc1_talking.png',
  npc1_hover_door_open: '/assets/images/networking_skills/npc1_hover_door_open.png',
  npc2_hover: '/assets/images/networking_skills/npc2_hover.png',
  npc2_talking: '/assets/images/networking_skills/npc2_talking.png',
  npc2_hover_door_open: '/assets/images/networking_skills/npc2_hover_door_open.png',
  edith_hover: '/assets/images/networking_skills/edith_hover.png',
  edith_talking: '/assets/images/networking_skills/edith_talking.png',
  edith_hover_door_open: '/assets/images/networking_skills/edith_hover_door_open.png',
  zoom_bag: '/assets/images/networking_skills/zoom_bag.png',
  zoom_phone: '/assets/images/networking_skills/zoom_phone.png',
  zoom_poster: '/assets/images/networking_skills/zoom_poster.png',
};

type ViewState = 'main' | 'bag' | 'phone' | 'poster';

const roomConfig: EscapeRoomConfig = {
  roomId: 'networking-skills',
  typewriterSpeed: 30,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: false,
  imageWidth: 1584,
  imageHeight: 1056,
};

@Component({
    selector: 'app-networking-skills-module12',
    templateUrl: './networking-skills-module12.component.html',
    styleUrl: './networking-skills-module12.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, RouterModule, MatDialogModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class NetworkingSkillsModule12Component extends EscapeRoomBaseComponent {

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

  // Puzzle 1: Initiate - track who has been talked to
  hastalkedNpc1: boolean = false;
  hasTalkedNpc2: boolean = false;
  hasTalkedEdith: boolean = false;
  npc2ConvStep: number = 0;
  edithConvStep: number = 0;

  // Puzzle 1 scoring
  puzzle1TotalWrong: number = 0;
  puzzle1WasRevealed: boolean = false;

  // Mirror
  isMirrorVisible: boolean = false;
  hasFoundMirror: boolean = false;

  // Puzzle 2: Build - conversation system
  buildStep: number = 0;
  buildTotalSteps: number = 8;
  typedReply: string = '';
  puzzle2TotalWrong: number = 0;
  puzzle2WasRevealed: boolean = false;

  // Puzzle 3: Maintain - phone messaging
  isPhoneVisible: boolean = false;
  fredrikDone: boolean = false;
  currentContactIndex: number = 0;
  contactOrder: string[] = ['maksym', 'iman', 'lars'];
  contactsDone: number = 0;
  lastMessageFeedback: string = '';
  puzzle3TotalWrong: number = 0;
  puzzle3WasRevealed: boolean = false;

  // Puzzle 4: Leverage
  isPosterVisible: boolean = false;
  puzzle4WrongAttempts: number = 0;
  puzzle4TotalWrong: number = 0;
  puzzle4WasRevealed: boolean = false;

  hotspots = {
    main: {
      npc1: { x: 25, y: 36, width: 23, height: 41 },
      edith: { x: 51, y: 23, width: 13, height: 72 },
      npc2: { x: 65, y: 39, width: 31, height: 60 },
      bag: { x: 0, y: 54, width: 13, height: 30 },
      phone: { x: 60, y: 38, width: 10, height: 12 },
      poster: { x: 9, y: 3, width: 7, height: 38 },
      exitDoor: { x: 0, y: 2, width: 28, height: 70 },
    },
    bag_zoom: {
      mirror: { x: 10, y: 0, width: 76, height: 94 },
    },
    poster_zoom: {
      content: { x: 27, y: 5, width: 32, height: 95 },
    },
  };

  override get characterImages(): CharacterImageMap {
    return {
      npc1: { hover: imagePaths.npc1_hover, hoverDoorOpen: imagePaths.npc1_hover_door_open },
      npc2: { hover: imagePaths.npc2_hover, hoverDoorOpen: imagePaths.npc2_hover_door_open },
      edith: { hover: imagePaths.edith_hover, hoverDoorOpen: imagePaths.edith_hover_door_open },
    };
  }

  protected override canInteractWithCharacter(): boolean {
    return this.currentView === 'main' && !this.activeDialogue && !this.isAnimating;
  }

  public override get isMainViewActive(): boolean {
    return this.currentView === 'main';
  }

  public override get isQuizActive(): boolean {
    return this.currentState === GameState.Leverage_Question;
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

    if (this.currentState === GameState.Leverage_Question) {
      this.currentBackgroundUrl = imagePaths.zoom_poster;
      return;
    }

    if (this.isDoorOpen) { this.currentBackgroundUrl = imagePaths.base_door_open; return; }

    switch (this.currentView) {
      case 'bag': this.currentBackgroundUrl = imagePaths.zoom_bag; break;
      case 'phone': this.currentBackgroundUrl = imagePaths.zoom_phone; break;
      case 'poster': this.currentBackgroundUrl = imagePaths.zoom_poster; break;
      default: this.currentBackgroundUrl = imagePaths.base; break;
    }
  }

  // --- Hint ---
  protected override onHintRequested(): void {
    this.isHintDialogue = true;
  }

  protected override getHintText(): string {
    switch (this.currentState) {
      case GameState.Initiate:
      case GameState.Initiate_Npc1:
        return this.t('hints.initiate');
      case GameState.Initiate_Npc2:
      case GameState.Initiate_Npc2_Conv:
        return this.t('hints.initiateNpc1Done');
      case GameState.Initiate_Edith:
      case GameState.Initiate_Edith_Conv:
        return this.t('hints.initiateNpc2Done');
      case GameState.Initiate_Complete:
        return this.t('hints.mirror');
      case GameState.FindMirror:
        return this.t('hints.mirror');
      case GameState.MirrorReflection:
        return this.t('hints.mirrorReflection');
      case GameState.Build_Intro:
        return this.t('hints.build');
      case GameState.Build_Conversation:
        return this.t('hints.buildConversation');
      case GameState.Build_Complete:
        return this.t('hints.maintain');
      case GameState.Maintain_Intro:
      case GameState.Maintain_Fredrik:
      case GameState.Maintain_Contacts:
        return this.t('hints.maintainContacts');
      case GameState.Maintain_Complete:
        return this.t('hints.leverage');
      case GameState.Leverage_Intro:
        return this.t('hints.leverage');
      case GameState.Leverage_Question:
        return this.t('hints.leverageQuestion');
      case GameState.Leverage_Complete:
      case GameState.Completion:
        return this.t('hints.completion');
      default:
        return this.t('hints.default');
    }
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

    // NPC1 interaction
    if (target === 'npc1' && this.currentView === 'main') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.npc1_talking;
      this.handleNpc1Interaction();
      return;
    }

    // NPC2 interaction
    if (target === 'npc2' && this.currentView === 'main') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.npc2_talking;
      this.handleNpc2Interaction();
      return;
    }

    // Edith interaction
    if (target === 'edith' && this.currentView === 'main') {
      this.playSound('step.wav');
      this.currentBackgroundUrl = imagePaths.edith_talking;
      this.handleEdithInteraction();
      return;
    }

    // Bag (FindMirror state)
    if (target === 'bag' && this.currentState === GameState.FindMirror && this.currentView === 'main') {
      this.zoomToLocation(target, this.hotspots.main, () => {
        this.currentView = 'bag';
        this.updateBackground();
        this.resetZoom(true);
      }, 2.5);
      return;
    }

    // Mirror within bag zoom
    if (this.currentView === 'bag' && target === 'mirror' && this.currentState === GameState.FindMirror) {
      this.playSound('paper-rustle.wav');
      this.hasFoundMirror = true;
      this.isMirrorVisible = true;
      return;
    }

    // Phone hotspot (Maintain)
    if (target === 'phone' && this.currentState === GameState.Maintain_Intro && this.currentView === 'main') {
      this.playSound('step.wav');
      this.isPhoneVisible = true;
      this.currentState = GameState.Maintain_Fredrik;
      return;
    }

    // Poster (Leverage)
    if (target === 'poster' && this.currentState === GameState.Leverage_Intro && this.currentView === 'main') {
      this.zoomToLocation(target, this.hotspots.main, () => {
        this.currentView = 'poster';
        this.updateBackground();
        this.resetZoom(true);
        // Player must click hotspot within zoomed view to start puzzle
      }, 2.5);
      return;
    }

    // --- Click within poster zoomed view to start leverage puzzle ---
    if (this.currentView === 'poster' && target === 'posterContent' && this.currentState === GameState.Leverage_Intro) {
      this.playSound('paper-rustle.wav');
      this.currentState = GameState.Leverage_Question;
      this.isPosterVisible = true;
      this.updateBackground();
      return;
    }
  }

  // --- NPC1 Interaction ---
  handleNpc1Interaction(): void {
    const name = this.t('characters.npc1.name');

    if (this.currentState === GameState.Initiate && !this.hastalkedNpc1) {
      this.showDialogue({ character: name, text: this.t('characters.npc1.dialogues.busy'), id: 'npc1_busy' });
    } else {
      this.showDialogue({ character: name, text: this.t('characters.npc1.dialogues.default'), id: 'npc1_default' });
    }
  }

  // --- NPC2 Interaction ---
  handleNpc2Interaction(): void {
    const npc2Name = this.t('characters.npc2.name');
    const youName = 'You';

    if ((this.currentState === GameState.Initiate || this.currentState === GameState.Initiate_Npc2) && !this.hasTalkedNpc2) {
      this.currentState = GameState.Initiate_Npc2;
      this.npc2ConvStep = 0;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.npc2.dialogues.line1_you'), id: 'npc2_line1_you' });
    } else {
      this.showDialogue({ character: npc2Name, text: this.t('characters.npc2.dialogues.default'), id: 'npc2_default' });
    }
  }

  // --- Edith Interaction ---
  handleEdithInteraction(): void {
    const edithName = this.t('characters.edith.name');
    const youName = 'You';

    if (this.currentState === GameState.Initiate || this.currentState === GameState.Initiate_Edith) {
      if (!this.hasTalkedEdith) {
        this.currentState = GameState.Initiate_Edith;
        this.edithConvStep = 0;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.edith.dialogues.line1_you'), id: 'edith_line1_you' });
      } else {
        this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.default'), id: 'edith_default' });
      }
    }
    else if (this.currentState === GameState.Build_Intro || this.currentState === GameState.Build_Conversation) {
      this.currentState = GameState.Build_Conversation;
      this.startBuildConversation();
    }
    else if (this.currentState === GameState.Completion) {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.default'), id: 'edith_default' });
    }
    else {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.default'), id: 'edith_default' });
    }
  }

  // --- Build conversation stepper ---
  startBuildConversation(): void {
    const edithName = this.t('characters.edith.name');

    if (this.buildStep === 0) {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.build1_her'), id: 'build_step0' });
    }
  }

  // --- Build puzzle choice handler ---
  selectBuildOption(option: 'a' | 'b'): void {
    const edithName = this.t('characters.edith.name');
    const youName = 'You';

    if (this.buildStep === 1) {
      // Step 1: open question vs self-centered
      if (option === 'a') {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.edith.dialogues.build2a_you'), id: 'build_step1a_you' });
      } else {
        this.puzzle2TotalWrong++;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.edith.dialogues.build2b_you'), id: 'build_step1b_you' });
      }
    }
    else if (this.buildStep === 4) {
      // Step 4: networking advice
      if (option === 'a') {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.edith.dialogues.build5a_you'), id: 'build_step4a_you' });
      } else {
        this.puzzle2TotalWrong++;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.edith.dialogues.build5b_you'), id: 'build_step4b_you' });
      }
    }
    else if (this.buildStep === 6) {
      // Step 6: reciprocity
      if (option === 'a') {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.edith.dialogues.build7a_you'), id: 'build_step6a_you' });
      } else {
        this.puzzle2TotalWrong++;
        this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.edith.dialogues.build7b_you'), id: 'build_step6b_you' });
      }
    }
  }

  // --- Submit typed reply for build ---
  submitTypedReply(): void {
    // Accept any typed input
    if (this.typedReply.trim().length > 0) {
      const edithName = this.t('characters.edith.name');
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.build4_her'), id: 'build_step3_her' });
      this.buildStep = 4;
    }
  }

  // --- Maintain puzzle: choose message option ---
  selectMessageOption(option: 'a' | 'b'): void {
    if (this.currentState === GameState.Maintain_Fredrik) {
      if (option === 'a') {
        this.lastMessageFeedback = this.t('puzzles.maintain.fredrik.feedbackA');
      } else {
        this.puzzle3TotalWrong++;
        this.lastMessageFeedback = this.t('puzzles.maintain.fredrik.feedbackB');
      }
      this.fredrikDone = true;
    }
    else if (this.currentState === GameState.Maintain_Contacts) {
      const contact = this.contactOrder[this.currentContactIndex];
      if (option === 'a') {
        this.lastMessageFeedback = this.t('puzzles.maintain.contacts.' + contact + '.feedbackA');
      } else {
        this.puzzle3TotalWrong++;
        this.lastMessageFeedback = this.t('puzzles.maintain.contacts.' + contact + '.feedbackB');
      }
      this.contactsDone++;
    }
  }

  // --- Maintain: advance to next contact ---
  nextContact(): void {
    this.lastMessageFeedback = '';
    if (this.currentState === GameState.Maintain_Fredrik) {
      this.currentState = GameState.Maintain_Contacts;
      this.currentContactIndex = 0;
      this.fredrikDone = false;
    } else if (this.currentState === GameState.Maintain_Contacts) {
      this.currentContactIndex++;
      if (this.currentContactIndex >= this.contactOrder.length) {
        // All contacts done
        this.isPhoneVisible = false;
        this.currentState = GameState.Maintain_Complete;
        this.recordPuzzleScore('Maintain', this.puzzle3TotalWrong, this.puzzle3WasRevealed);
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.maintain.feedback.allSent'), id: 'system_maintainAllSent' });
      }
    }
  }

  // --- Leverage: submit answer ---
  submitLeverageAnswer(contactId: string): void {
    if (contactId === 'edith') {
      this.playSound('success-chime.wav');
      this.puzzleFeedback = '';
      this.recordPuzzleScore('Leverage', this.puzzle4TotalWrong, this.puzzle4WasRevealed);
      this.isPosterVisible = false;
      this.currentView = 'main';
      this.currentState = GameState.Leverage_Complete;
      this.updateBackground();
      setTimeout(() => {
        this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.leverage.feedback.correct'), id: 'system_leverageCorrect' });
      }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
    } else {
      this.playSound('error-buzz.mp3');
      this.isPuzzleWrong = true;
      this.puzzle4WrongAttempts++;
      this.puzzle4TotalWrong++;

      if (this.puzzle4WrongAttempts >= 3) {
        this.puzzle4WasRevealed = true;
        this.answerOverlayText = this.t('puzzles.leverage.answerOverlay');
        this.answerOverlayCallback = () => {
          this.puzzle4WrongAttempts = 0;
          this.recordPuzzleScore('Leverage', this.puzzle4TotalWrong, this.puzzle4WasRevealed);
          this.isPosterVisible = false;
          this.currentView = 'main';
          this.currentState = GameState.Leverage_Complete;
          this.updateBackground();
          setTimeout(() => {
            this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.leverage.feedback.correct'), id: 'system_leverageCorrect' });
          }, ESCAPE_ROOM_TIMING.completionTransitionDelay);
        };
        this.showAnswerOverlay = true;
      } else {
        this.puzzleFeedback = this.t('puzzles.leverage.feedback.wrong');
        const explanation = this.t('puzzles.leverage.explanations.' + contactId);
        if (explanation) {
          this.puzzleFeedback = explanation;
        }
      }

      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // --- Leverage options getter ---
  get leverageOptions() {
    return [
      { id: 'maksym', text: this.t('puzzles.leverage.options.maksym') },
      { id: 'edith', text: this.t('puzzles.leverage.options.edith') },
      { id: 'iman', text: this.t('puzzles.leverage.options.iman') },
      { id: 'lars', text: this.t('puzzles.leverage.options.lars') },
    ];
  }

  // --- Skip puzzle methods ---
  skipPuzzle1(): void {
    this.recordPuzzleScore('Initiate', 99, true);
    this.hastalkedNpc1 = true;
    this.hasTalkedNpc2 = true;
    this.hasTalkedEdith = true;
    this.currentState = GameState.FindMirror;
    this.puzzleFeedback = '';
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.initiateComplete'), id: 'system_initiateComplete' });
  }

  skipPuzzle2(): void {
    this.recordPuzzleScore('Build', 99, true);
    this.currentState = GameState.Build_Complete;
    this.puzzleFeedback = '';
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.buildComplete'), id: 'system_buildComplete' });
  }

  skipPuzzle3(): void {
    this.recordPuzzleScore('Maintain', 99, true);
    this.isPhoneVisible = false;
    this.currentState = GameState.Maintain_Complete;
    this.puzzleFeedback = '';
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.maintain.feedback.allSent'), id: 'system_maintainAllSent' });
  }

  skipPuzzle4(): void {
    this.recordPuzzleScore('Leverage', 99, true);
    this.isPosterVisible = false;
    this.currentView = 'main';
    this.currentState = GameState.Leverage_Complete;
    this.puzzleFeedback = '';
    this.updateBackground();
    this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.leverage.feedback.correct'), id: 'system_leverageCorrect' });
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

    const edithName = this.t('characters.edith.name');
    const npc2Name = this.t('characters.npc2.name');
    const youName = 'You';

    // Intro self-talk → Initiate state
    if (id === 'system_enterRoom') {
      this.currentState = GameState.Initiate;
    }

    // --- NPC1 conversation ---
    else if (id === 'npc1_busy') {
      this.hastalkedNpc1 = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.npc1Rejection'), id: 'system_npc1Rejection' });
    }
    else if (id === 'system_npc1Rejection') {
      this.checkInitiateComplete();
    }

    // --- NPC2 conversation (4 exchanges) ---
    else if (id === 'npc2_line1_you') {
      this.showDialogue({ character: npc2Name, text: this.t('characters.npc2.dialogues.line1_him'), id: 'npc2_line1_him' });
    }
    else if (id === 'npc2_line1_him') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.npc2.dialogues.line2_you'), id: 'npc2_line2_you' });
    }
    else if (id === 'npc2_line2_you') {
      this.showDialogue({ character: npc2Name, text: this.t('characters.npc2.dialogues.line2_him'), id: 'npc2_line2_him' });
    }
    else if (id === 'npc2_line2_him') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.npc2.dialogues.line3_you'), id: 'npc2_line3_you' });
    }
    else if (id === 'npc2_line3_you') {
      this.showDialogue({ character: npc2Name, text: this.t('characters.npc2.dialogues.line3_him'), id: 'npc2_line3_him' });
    }
    else if (id === 'npc2_line3_him') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.npc2.dialogues.line4_awkward'), id: 'npc2_line4_you' });
    }
    else if (id === 'npc2_line4_you') {
      this.showDialogue({ character: npc2Name, text: this.t('characters.npc2.dialogues.line4_awkward'), id: 'npc2_line4_him' });
    }
    else if (id === 'npc2_line4_him') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.npc2.dialogues.summary'), id: 'npc2_summary' });
    }
    else if (id === 'npc2_summary') {
      this.hasTalkedNpc2 = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.npc2Awkward'), id: 'system_npc2Awkward' });
    }
    else if (id === 'system_npc2Awkward') {
      this.currentState = GameState.Initiate;
      this.checkInitiateComplete();
    }

    // --- Edith intro conversation (7 exchanges) ---
    else if (id === 'edith_line1_you') {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.line1_her'), id: 'edith_line1_her' });
    }
    else if (id === 'edith_line1_her') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.edith.dialogues.line2_you'), id: 'edith_line2_you' });
    }
    else if (id === 'edith_line2_you') {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.line2_her'), id: 'edith_line2_her' });
    }
    else if (id === 'edith_line2_her') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.edith.dialogues.line3_you'), id: 'edith_line3_you' });
    }
    else if (id === 'edith_line3_you') {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.line3_her'), id: 'edith_line3_her' });
    }
    else if (id === 'edith_line3_her') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.edith.dialogues.line4_you'), id: 'edith_line4_you' });
    }
    else if (id === 'edith_line4_you') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('characters.edith.dialogues.summary'), id: 'edith_summary' });
    }
    else if (id === 'edith_summary') {
      this.hasTalkedEdith = true;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.edithSuccess'), id: 'system_edithSuccess' });
    }
    else if (id === 'system_edithSuccess') {
      this.currentState = GameState.Initiate;
      this.checkInitiateComplete();
    }

    // --- Initiate complete ---
    else if (id === 'system_initiateComplete') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.initiate.skillUnlocked'), id: 'system_initiateSkill' });
    }
    else if (id === 'system_initiateSkill') {
      this.currentState = GameState.FindMirror;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.mirrorFound'), id: 'system_mirrorFound' });
    }
    else if (id === 'system_mirrorFound') {
      // Player should click bag
    }

    // --- Mirror ---
    else if (id === 'system_mirrorReflection') {
      this.currentState = GameState.MirrorReflection;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.mirror.selfReflection'), id: 'system_selfReflection' });
    }
    else if (id === 'system_selfReflection') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.edithReturns'), id: 'system_edithReturns' });
    }
    else if (id === 'system_edithReturns') {
      this.currentState = GameState.Build_Intro;
    }

    // --- Build conversation ---
    else if (id === 'build_step0') {
      // Edith asked "what drives you?" — show choice
      this.buildStep = 1;
    }
    else if (id === 'build_step1a_you') {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.build2a_response'), id: 'build_step1a_response' });
    }
    else if (id === 'build_step1b_you') {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.build2b_response'), id: 'build_step1b_response' });
    }
    else if (id === 'build_step1a_response' || id === 'build_step1b_response') {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.build3_her'), id: 'build_step2_her' });
    }
    else if (id === 'build_step2_her') {
      // Show typed reply prompt
      this.buildStep = 3;
    }
    else if (id === 'build_step3_her') {
      // Edith responded to typed reply → show next choice
      this.buildStep = 4;
    }
    else if (id === 'build_step4a_you') {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.build5a_response'), id: 'build_step4a_response' });
    }
    else if (id === 'build_step4b_you') {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.build5b_response'), id: 'build_step4b_response' });
    }
    else if (id === 'build_step4a_response' || id === 'build_step4b_response') {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.build6_her'), id: 'build_step5_her' });
    }
    else if (id === 'build_step5_her') {
      // Show final choice
      this.buildStep = 6;
    }
    else if (id === 'build_step6a_you') {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.build7a_response'), id: 'build_step6a_response' });
    }
    else if (id === 'build_step6b_you') {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.build7b_response'), id: 'build_step6b_response' });
    }
    else if (id === 'build_step6a_response' || id === 'build_step6b_response') {
      this.showDialogue({ character: edithName, text: this.t('characters.edith.dialogues.build8_her'), id: 'build_step7_her' });
    }
    else if (id === 'build_step7_her') {
      this.recordPuzzleScore('Build', this.puzzle2TotalWrong, this.puzzle2WasRevealed);
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.build.skillUnlocked'), id: 'system_buildSkill' });
    }
    else if (id === 'system_buildSkill') {
      this.currentState = GameState.Build_Complete;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.buildComplete'), id: 'system_buildComplete' });
    }
    else if (id === 'system_buildComplete') {
      this.currentState = GameState.Maintain_Intro;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.phoneNotification'), id: 'system_phoneNotification' });
    }
    else if (id === 'system_phoneNotification') {
      // Player should see phone hotspot pulse
    }

    // --- Maintain complete ---
    else if (id === 'system_maintainAllSent') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.maintain.skillUnlocked'), id: 'system_maintainSkill' });
    }
    else if (id === 'system_maintainSkill') {
      this.currentState = GameState.Leverage_Intro;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.noticePoster'), id: 'system_noticePoster' });
    }
    else if (id === 'system_noticePoster') {
      // Player should click poster
    }

    // --- Leverage complete ---
    else if (id === 'system_leverageCorrect') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('puzzles.leverage.skillUnlocked'), id: 'system_leverageSkill' });
    }
    else if (id === 'system_leverageSkill') {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.congratulations'), id: 'system_congratulations' });
    }
    else if (id === 'system_congratulations') {
      this.currentState = GameState.Completion;
      this.isDoorOpen = true;
      this.playDoorSound();
      this.updateBackground();
    }
  }

  // --- Check if all 3 NPCs have been talked to ---
  private checkInitiateComplete(): void {
    if (this.hastalkedNpc1 && this.hasTalkedNpc2 && this.hasTalkedEdith) {
      this.recordPuzzleScore('Initiate', this.puzzle1TotalWrong, this.puzzle1WasRevealed);
      this.currentState = GameState.Initiate_Complete;
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.initiateComplete'), id: 'system_initiateComplete' });
    }
  }

  handleDialogueDismiss(): void {
    this.dismissDialogue();
  }

  // --- Intro popup closed ---
  protected override onIntroPopupClosed(): void {
    this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.enterRoom'), id: 'system_enterRoom' });
  }

  // --- UI Helpers ---
  protected override resetZoomState(): void {
    this.currentView = 'main';
  }

  closeMirror(): void {
    this.isMirrorVisible = false;
    this.goBack();
    if (this.currentState === GameState.FindMirror) {
      this.showDialogue({ character: this.playerSpeaker, text: this.t('systemDialogues.mirrorClose'), id: 'system_mirrorReflection' });
    }
  }

  // --- Current contact name (for template) ---
  get currentContactName(): string {
    if (this.currentContactIndex < this.contactOrder.length) {
      return this.t('puzzles.maintain.contacts.' + this.contactOrder[this.currentContactIndex] + '.name');
    }
    return '';
  }

  get currentContactOptionA(): string {
    if (this.currentContactIndex < this.contactOrder.length) {
      return this.t('puzzles.maintain.contacts.' + this.contactOrder[this.currentContactIndex] + '.optionA');
    }
    return '';
  }

  get currentContactOptionB(): string {
    if (this.currentContactIndex < this.contactOrder.length) {
      return this.t('puzzles.maintain.contacts.' + this.contactOrder[this.currentContactIndex] + '.optionB');
    }
    return '';
  }

  // --- Build conversation: whether a choice is active ---
  get isBuildChoiceActive(): boolean {
    return this.currentState === GameState.Build_Conversation &&
      (this.buildStep === 1 || this.buildStep === 4 || this.buildStep === 6);
  }

  get isBuildTypedActive(): boolean {
    return this.currentState === GameState.Build_Conversation && this.buildStep === 3;
  }
}

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
  ExploreDesk,
  ReadReportIntro1,
  ReadReportIntro2,
  ReadReport,
  ReportClosed1,
  ReportClosed2,
  OpenNotes,
  ObjectiveIntro,
  ObjectiveSelect,
  ObjectivePickDeadline,
  ObjectiveFinal,
  OpenLaptop,
  EmailsIntro,
  EmailsRead,
  EmailsReply,
  EmailsReplyChosen,
  PhoneRinging,
  PhonePicked,
  ScopeCreepReply,
  ScopeCreepComplete1,
  ScopeCreepComplete2,
  ReadCalendar,
  CalendarThought,
  CarolineKnock,
  CarolineArrived,
  CarolineConversation,
  Completion,
  DoorOpen
}

type ViewState = 'main' | 'report' | 'notes' | 'laptop' | 'phone' | 'calendar';

const imagePaths = {
  base: '/assets/images/project_management/office_room.png',
  baseCaroline: '/assets/images/project_management/office_room_caroline.png',
  baseDoorOpen: '/assets/images/project_management/office_room_door_open.png',
  baseCarolineDoorOpen: '/assets/images/project_management/office_room_caroline_door_open.png',
  carolineHover: '/assets/images/project_management/caroline_hover.png',
  carolineHoverDoorOpen: '/assets/images/project_management/caroline_hover_door_open.png',
  carolineTalking: '/assets/images/project_management/caroline_talking.png',

  zoomReport: '/assets/images/project_management/zoom_report.png',
  zoomReportOpen: '/assets/images/project_management/zoom_report_open.png',
  zoomNotes: '/assets/images/project_management/zoom_notes.png',
  zoomLaptop: '/assets/images/project_management/zoom_laptop.png',
  zoomLaptopOpen: '/assets/images/project_management/zoom_laptop_open.png',
  zoomPhone: '/assets/images/project_management/zoom_phone.png',
  zoomCalendar: '/assets/images/project_management/zoom_calendar.png',
  zoomCalendarRinged: '/assets/images/project_management/zoom_calendar_ringed.png',
};

const roomConfig: EscapeRoomConfig = {
  roomId: 'project-management',
  typewriterSpeed: 25,
  defaultZoomLevel: 2.5,
  characterZoomLevel: 2.5,
  preloadDoorSound: true,
  imageWidth: 1584,
  imageHeight: 1056,
};

interface ObjectiveNote {
  id: string;
  text: string;
  correct: boolean;
  thought: string;
  selected: boolean;
}

interface EmailData {
  id: string;
  sender: string;
  subject: string;
  body: string;
  thought: string;
  read: boolean;
}

interface ReplyOption {
  id: string;
  shorthand: string;
  full: string;
  correct: boolean;
  reflection: string;
}

interface ScopeReplyOption {
  id: string;
  text: string;
  correct: boolean;
  feedback: string;
  hidden: boolean;
}

interface ConversationStep {
  id: string;
  npcText: string;
  replyText: string;
}

@Component({
    selector: 'app-project-management-module14',
    templateUrl: './project-management-module14.component.html',
    styleUrl: './project-management-module14.component.scss',
    imports: [RoomHelpButtonComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule, MatDialogModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    animations: [fadeInOut]
})
export class ProjectManagementModule14Component extends EscapeRoomBaseComponent {

  public GameState = GameState;
  public imagePaths = imagePaths;

  trackById = (_: number, item: { id: string }) => item.id;
  trackByIndex = (index: number) => index;
  trackByKey = (_: number, item: { key: string }) => item.key;

  override get config(): EscapeRoomConfig { return roomConfig; }

  public currentState: GameState = GameState.Intro;
  public currentView: ViewState = 'main';

  override get characterImages(): CharacterImageMap {
    return {
      caroline: { hover: imagePaths.carolineHover, hoverDoorOpen: imagePaths.carolineHoverDoorOpen }
    };
  }

  hotspots = {
    // Corrected per VLM grounding audit 2026-04-24
    main: {
      report:   { x: 42, y: 70, width: 18, height: 14 },
      notes:    { x: 15, y: 65, width: 24, height: 17 },
      laptop:   { x: 55, y: 54, width: 33, height: 28 },
      phone:    { x: 45, y: 18, width: 10, height: 12 },
      calendar: { x: 68, y: 19, width: 14, height: 17 },
      frontDoor:{ x: 12, y: 4,  width: 20, height: 58 },
      caroline: { x: 0,  y: 4,  width: 38, height: 92 },
    },
    report_zoom: { content: { x: 15, y: 15, width: 70, height: 70 } },
    notes_zoom: { content: { x: 15, y: 15, width: 70, height: 70 } },
    laptop_zoom: { content: { x: 15, y: 15, width: 70, height: 70 } },
    phone_zoom: { content: { x: 15, y: 15, width: 70, height: 70 } },
    calendar_zoom: { content: { x: 15, y: 15, width: 70, height: 70 } },
  };

  // ── Per-puzzle completion flags ──
  public reportRead: boolean = false;
  public objectiveDone: boolean = false;
  public emailsDone: boolean = false;
  public scopeCreepDone: boolean = false;
  public calendarDone: boolean = false;
  public carolineDone: boolean = false;

  // ── Progress report ──
  public isReportOpen: boolean = false;

  // ── Objective puzzle ──
  public objectiveNotes: ObjectiveNote[] = [];
  public objectiveFeedbackId: string | null = null;
  public hasSelectedCorrectObjective: boolean = false;
  public objectiveSubmitted: boolean = false;
  public deadlineTooltip: string | null = null;

  // ── Emails puzzle ──
  public emails: EmailData[] = [];
  public currentEmail: EmailData | null = null;
  public replyOptions: ReplyOption[] = [];
  public selectedReplyId: string | null = null;
  public puzzleEmailsTotalWrong: number = 0;

  // ── Scope creep puzzle ──
  public scopeReplyOptions: ScopeReplyOption[] = [];
  public scopeCorrectChosen: boolean = false;
  public puzzleScopeTotalWrong: number = 0;

  // ── Caroline conversation ──
  public conversationSteps: ConversationStep[] = [
    { id: 'step1', npcText: '', replyText: '' },
    { id: 'step2', npcText: '', replyText: '' },
    { id: 'step3', npcText: '', replyText: '' },
    { id: 'step4', npcText: '', replyText: '' },
    { id: 'step5', npcText: '', replyText: '' },
    { id: 'step6', npcText: '', replyText: '' },
    { id: 'step7', npcText: '', replyText: '' },
  ];
  public conversationIndex: number = 0;
  public conversationShowReply: boolean = false;

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
      imagePaths.base,
      imagePaths.baseCaroline,
      imagePaths.baseDoorOpen,
      imagePaths.baseCarolineDoorOpen,
      imagePaths.carolineHover,
      imagePaths.carolineHoverDoorOpen,
    ]).then(() => this.updateBackground());

    const initInterval = setInterval(() => {
      if (Object.keys(this.texts).length > 0) {
        this.loadAllTexts();
        clearInterval(initInterval);
      }
    }, 100);
  }

  private loadAllTexts(): void {
    // Load objective notes
    this.objectiveNotes = [];
    const notesRaw = this.getRawArray('puzzles.objective.notes');
    for (const n of notesRaw) {
      this.objectiveNotes.push({
        id: n.id,
        text: n.text,
        correct: n.correct,
        thought: n.thought,
        selected: false,
      });
    }

    // Load emails
    this.emails = [];
    const emailsRaw = this.getRawArray('puzzles.stakeholders.emails');
    for (const e of emailsRaw) {
      this.emails.push({
        id: e.id,
        sender: e.sender,
        subject: e.subject,
        body: e.body,
        thought: e.thought,
        read: false,
      });
    }

    // Load reply options
    this.replyOptions = this.getRawArray('puzzles.stakeholders.replyOptions');

    // Load scope reply options
    const scopeRaw = this.getRawArray('puzzles.scopeCreep.replyOptions');
    this.scopeReplyOptions = scopeRaw.map((r: any) => ({ ...r, hidden: false }));

    // Load conversation
    for (let i = 0; i < this.conversationSteps.length; i++) {
      const step = this.conversationSteps[i];
      step.npcText = this.t(`characters.caroline.dialogues.${step.id}`);
      step.replyText = this.t(`userReplies.${step.id}`);
    }
  }

  private getRawArray(path: string): any[] {
    const parts = path.split('.');
    let current: any = this.texts;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return [];
      current = current[part];
    }
    return Array.isArray(current) ? current : [];
  }

  override get isMainViewActive(): boolean { return this.currentView === 'main'; }
  override get isQuizActive(): boolean {
    // Only overlay-card puzzles blur the scene. Conversations and
    // hotspot-on-scene states keep the scene sharp.
    return this.currentState === GameState.ReadReport ||
           this.currentState === GameState.ObjectiveSelect ||
           this.currentState === GameState.ObjectivePickDeadline ||
           this.currentState === GameState.ObjectiveFinal ||
           this.currentState === GameState.EmailsIntro ||
           this.currentState === GameState.EmailsRead ||
           this.currentState === GameState.EmailsReply ||
           this.currentState === GameState.EmailsReplyChosen ||
           this.currentState === GameState.ScopeCreepReply;
  }

  override updateBackground(): void {
    const v = this.currentView;
    if (v === 'main') {
      if (this.currentState === GameState.DoorOpen || this.currentState === GameState.Completion) {
        this.currentBackgroundUrl = imagePaths.baseCarolineDoorOpen;
      } else if (this.hasCarolineArrived()) {
        this.currentBackgroundUrl = imagePaths.baseCaroline;
      } else {
        this.currentBackgroundUrl = imagePaths.base;
      }
      return;
    }
    this.currentBackgroundUrl = this.zoomImage(v);
  }

  private zoomImage(v: ViewState): string {
    switch (v) {
      case 'report': return this.isReportOpen ? imagePaths.zoomReportOpen : imagePaths.zoomReport;
      case 'notes': return imagePaths.zoomNotes;
      case 'laptop': return (this.currentState >= GameState.EmailsIntro) ? imagePaths.zoomLaptopOpen : imagePaths.zoomLaptop;
      case 'phone': return imagePaths.zoomPhone;
      case 'calendar': return this.calendarDone ? imagePaths.zoomCalendarRinged : imagePaths.zoomCalendar;
      default: return imagePaths.base;
    }
  }

  private hasCarolineArrived(): boolean {
    return this.currentState === GameState.CarolineArrived ||
           this.currentState === GameState.CarolineConversation ||
           this.currentState === GameState.DoorOpen ||
           this.currentState === GameState.Completion;
  }

  protected override resetZoomState(): void {
    this.currentView = 'main';
    this.currentEmail = null;
  }

  protected override onIntroPopupClosed(): void {
    this.currentState = GameState.ExploreDesk;
    this.updateBackground();
    setTimeout(() => this.showHintPulse(), 400);
  }

  // ── Hotspot click routing ──
  override onHotspotClick(target: string): void {
    if (this.isAnimating) return;

    if (!this.isMainViewActive) return;

    // Only report is actionable until it's read
    if (!this.reportRead && target !== 'report') return;

    switch (target) {
      case 'report': this.openReport(); break;
      case 'notes':
        if (this.reportRead && !this.objectiveDone) this.openNotes();
        break;
      case 'laptop':
        if (this.objectiveDone && !this.emailsDone) this.openLaptop();
        break;
      case 'phone':
        if (this.emailsDone && !this.scopeCreepDone && this.currentState === GameState.PhoneRinging) this.pickUpPhone();
        break;
      case 'calendar':
        if (this.scopeCreepDone && !this.calendarDone) this.openCalendar();
        break;
      case 'frontDoor':
        if (this.calendarDone && !this.carolineDone) this.answerCarolineKnock();
        break;
      case 'caroline':
        if (this.currentState === GameState.CarolineArrived) this.startCarolineConversation();
        break;
    }
    if (target === 'frontDoor' && this.currentState === GameState.DoorOpen) {
      this.confirmExit();
    }
  }

  public isHotspotPulsing(target: string): boolean {
    if (!this.showHints) return false;
    if (this.currentState === GameState.ExploreDesk && target === 'report') return true;
    if (this.reportRead && !this.objectiveDone && target === 'notes') return true;
    if (this.objectiveDone && !this.emailsDone && target === 'laptop') return true;
    if (this.currentState === GameState.PhoneRinging && target === 'phone') return true;
    if (this.scopeCreepDone && !this.calendarDone && target === 'calendar') return true;
    if (this.currentState === GameState.CarolineKnock && target === 'frontDoor') return true;
    if (this.currentState === GameState.CarolineArrived && target === 'caroline') return true;
    if (this.currentState === GameState.DoorOpen && target === 'frontDoor') return true;
    return false;
  }

  // ── Progress Report (starter puzzle) ──
  private openReport(): void {
    this.zoomToLocation('report', this.hotspots.main, () => {
      this.currentView = 'report';
      this.isReportOpen = false;
      this.currentState = GameState.ReadReportIntro1;
      this.updateBackground();
      this.showDialogue({ character: '', text: this.t('puzzles.progressReport.introThought1'), id: 'report-intro-1' });
    });
  }

  public closeReport(): void {
    this.isReportOpen = false;
    this.currentState = GameState.ReportClosed1;
    this.updateBackground();
    this.goBack();
    setTimeout(() => {
      this.showDialogue({ character: '', text: this.t('puzzles.progressReport.closedThought1'), id: 'report-closed-1' });
    }, ESCAPE_ROOM_TIMING.zoomOutDelay + 100);
  }

  // ── Objective puzzle ──
  private openNotes(): void {
    this.zoomToLocation('notes', this.hotspots.main, () => {
      this.currentView = 'notes';
      this.currentState = GameState.OpenNotes;
      this.updateBackground();
      this.showDialogue({ character: '', text: this.t('puzzles.objective.introThought'), id: 'notes-intro' });
    });
  }

  public toggleObjectiveNote(id: string): void {
    if (this.objectiveSubmitted) return;
    const n = this.objectiveNotes.find(x => x.id === id);
    if (!n) return;
    n.selected = !n.selected;
    this.objectiveFeedbackId = n.selected ? id : null;
  }

  public get allCorrectNotesSelected(): boolean {
    const allCorrectSelected = this.objectiveNotes.filter(n => n.correct).every(n => n.selected);
    const noIncorrectSelected = this.objectiveNotes.filter(n => !n.correct).every(n => !n.selected);
    return allCorrectSelected && noIncorrectSelected;
  }

  public submitObjective(): void {
    if (!this.allCorrectNotesSelected) {
      this.playSound('error-buzz.mp3');
      this.puzzleFeedback = this.t('hints.objectiveWrong');
      this.isPuzzleWrong = true;
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
      return;
    }
    this.puzzleFeedback = '';
    this.objectiveSubmitted = true;
    this.hasSelectedCorrectObjective = true;
    this.currentState = GameState.ObjectivePickDeadline;
    this.showDialogue({ character: '', text: this.t('puzzles.objective.objectiveDoneThought'), id: 'objective-done' });
  }

  public pickDeadline(which: 'asap' | 'threeMonths'): void {
    if (which === 'asap') {
      this.deadlineTooltip = this.t('puzzles.objective.deadlineTooltip');
      this.playSound('error-buzz.mp3');
      return;
    }
    this.deadlineTooltip = null;
    this.recordPuzzleScore('objective', 0, false);
    this.objectiveDone = true;
    this.currentState = GameState.ObjectiveFinal;
    this.showDialogue({ character: '', text: this.t('puzzles.objective.completionThought'), id: 'objective-complete' });
  }

  // ── Emails puzzle ──
  private openLaptop(): void {
    this.zoomToLocation('laptop', this.hotspots.main, () => {
      this.playSound('success-chime.wav');
      this.currentView = 'laptop';
      this.currentState = GameState.EmailsIntro;
      this.updateBackground();
      this.showDialogue({ character: '', text: this.t('puzzles.stakeholders.introThought'), id: 'emails-intro' });
    });
  }

  public openEmail(email: EmailData): void {
    this.currentEmail = email;
    email.read = true;
  }

  public closeEmail(): void {
    const allRead = this.emails.every(e => e.read);
    this.currentEmail = null;
    if (allRead && this.currentState === GameState.EmailsRead) {
      this.currentState = GameState.EmailsReply;
    }
  }

  public get allEmailsRead(): boolean { return this.emails.length > 0 && this.emails.every(e => e.read); }

  public chooseReply(id: string): void {
    this.selectedReplyId = id;
    this.puzzleFeedback = '';
  }

  public getSelectedReplyFull(): string {
    if (!this.selectedReplyId) return '';
    const r = this.replyOptions.find(o => o.id === this.selectedReplyId);
    return r ? r.full : '';
  }

  public objectiveFeedbackText(): string {
    if (!this.objectiveFeedbackId) return '';
    const n = this.objectiveNotes.find(x => x.id === this.objectiveFeedbackId);
    return n ? n.thought : '';
  }

  public sendReply(): void {
    if (!this.selectedReplyId) return;
    const opt = this.replyOptions.find(o => o.id === this.selectedReplyId);
    if (!opt) return;
    if (opt.correct) {
      this.recordPuzzleScore('emails', this.puzzleEmailsTotalWrong, false);
      this.emailsDone = true;
      this.currentState = GameState.EmailsReplyChosen;
      this.showDialogue({ character: '', text: opt.reflection, id: 'emails-done' });
    } else {
      this.puzzleEmailsTotalWrong++;
      this.playSound('error-buzz.mp3');
      this.puzzleFeedback = opt.reflection;
      this.isPuzzleWrong = true;
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // ── Phone / Scope creep ──
  private triggerPhoneCall(): void {
    this.currentState = GameState.PhoneRinging;
    this.updateBackground();
    this.playSound('hint-sound.wav'); // substitute phone ring
    setTimeout(() => this.showHintPulse(), 300);
  }

  private pickUpPhone(): void {
    this.zoomToLocation('phone', this.hotspots.main, () => {
      this.currentView = 'phone';
      this.currentState = GameState.PhonePicked;
      this.updateBackground();
      this.showDialogue({ character: '', text: this.t('puzzles.scopeCreep.callerIntro'), id: 'phone-caller' });
    });
  }

  public chooseScopeReply(id: string): void {
    const opt = this.scopeReplyOptions.find(r => r.id === id);
    if (!opt || opt.hidden) return;
    if (opt.correct) {
      this.recordPuzzleScore('scope_creep', this.puzzleScopeTotalWrong, false);
      this.scopeCorrectChosen = true;
      this.showDialogue({ character: '', text: this.t('puzzles.scopeCreep.correctReplyText'), id: 'scope-correct-reply' });
    } else {
      this.puzzleScopeTotalWrong++;
      this.playSound('error-buzz.mp3');
      opt.hidden = true;
      this.puzzleFeedback = opt.feedback;
      this.isPuzzleWrong = true;
      setTimeout(() => this.isPuzzleWrong = false, ESCAPE_ROOM_TIMING.shakeTimeout);
    }
  }

  // ── Calendar ──
  private openCalendar(): void {
    this.zoomToLocation('calendar', this.hotspots.main, () => {
      this.currentView = 'calendar';
      this.currentState = GameState.CalendarThought;
      this.calendarDone = true; // show ringed state
      this.recordPuzzleScore('calendar', 0, false);
      this.updateBackground();
      this.showDialogue({ character: '', text: this.t('puzzles.calendar.deadlineThought'), id: 'calendar-thought' });
    });
  }

  // ── Caroline sequence ──
  private triggerCarolineKnock(): void {
    this.currentState = GameState.CarolineKnock;
    this.playSound('door-open.wav'); // substitute for knock
    setTimeout(() => this.showHintPulse(), 300);
  }

  private answerCarolineKnock(): void {
    this.currentState = GameState.CarolineArrived;
    this.updateBackground();
    this.showDialogue({ character: '', text: this.t('puzzles.caroline.arrivalDialogue'), id: 'caroline-knock' });
  }

  private startCarolineConversation(): void {
    this.conversationIndex = 0;
    this.conversationShowReply = false;
    this.currentState = GameState.CarolineConversation;
    this.showDialogue({
      character: this.t('characters.caroline.name'),
      text: this.conversationSteps[0].npcText,
      id: `caroline-${this.conversationSteps[0].id}`
    });
  }

  public selectCarolineReply(): void {
    const step = this.conversationSteps[this.conversationIndex];
    this.showDialogue({ character: '', text: step.replyText, id: `caroline-reply-${step.id}` });
    this.conversationShowReply = true;
  }

  public advanceCarolineConversation(): void {
    this.conversationShowReply = false;
    this.conversationIndex++;
    if (this.conversationIndex >= this.conversationSteps.length) {
      this.recordPuzzleScore('caroline', 0, false);
      this.carolineDone = true;
      this.activeDialogue = null;
      this.finalizeAndReportScore();
      this.currentState = GameState.DoorOpen;
      this.isDoorOpen = true;
      this.updateBackground();
      this.playDoorSound();
      setTimeout(() => this.isGameCompleteOverlayVisible = true, 1200);
    } else {
      const next = this.conversationSteps[this.conversationIndex];
      this.showDialogue({ character: this.t('characters.caroline.name'), text: next.npcText, id: `caroline-${next.id}` });
    }
  }

  // ── Dialogue dismissal (ID-based) ──
  override dismissDialogue(): void {
    if (!this.activeDialogue) return;
    const id = this.activeDialogue.id;

    if (id === 'report-intro-1') {
      this.activeDialogue = null;
      this.showDialogue({ character: '', text: this.t('puzzles.progressReport.introThought2'), id: 'report-intro-2' });
      return;
    }
    if (id === 'report-intro-2') {
      this.activeDialogue = null;
      this.isReportOpen = true;
      this.currentState = GameState.ReadReport;
      this.updateBackground();
      return;
    }
    if (id === 'report-closed-1') {
      this.activeDialogue = null;
      this.showDialogue({ character: '', text: this.t('puzzles.progressReport.closedThought2'), id: 'report-closed-2' });
      return;
    }
    if (id === 'report-closed-2') {
      this.activeDialogue = null;
      this.reportRead = true;
      this.recordPuzzleScore('read_report', 0, false);
      this.currentState = GameState.ExploreDesk;
      this.showHintPulse();
      return;
    }
    if (id === 'notes-intro') {
      this.activeDialogue = null;
      this.currentState = GameState.ObjectiveIntro;
      this.showDialogue({ character: '', text: this.t('puzzles.objective.introDialogue'), id: 'notes-instruction' });
      return;
    }
    if (id === 'notes-instruction') {
      this.activeDialogue = null;
      this.currentState = GameState.ObjectiveSelect;
      return;
    }
    if (id === 'objective-done') {
      this.activeDialogue = null;
      return;
    }
    if (id === 'objective-complete') {
      this.activeDialogue = null;
      this.currentState = GameState.ExploreDesk;
      this.goBack();
      setTimeout(() => this.showHintPulse(), ESCAPE_ROOM_TIMING.zoomOutDelay + 100);
      return;
    }
    if (id === 'emails-intro') {
      this.activeDialogue = null;
      this.currentState = GameState.EmailsRead;
      return;
    }
    if (id === 'emails-done') {
      this.activeDialogue = null;
      this.goBack();
      setTimeout(() => this.triggerPhoneCall(), ESCAPE_ROOM_TIMING.zoomOutDelay + 300);
      return;
    }
    if (id === 'phone-caller') {
      this.activeDialogue = null;
      this.currentState = GameState.ScopeCreepReply;
      return;
    }
    if (id === 'scope-correct-reply') {
      this.activeDialogue = null;
      this.showDialogue({ character: this.t('characters.caroline.name').length ? '' : '', text: this.t('puzzles.scopeCreep.npcResponse'), id: 'scope-npc-response' });
      return;
    }
    if (id === 'scope-npc-response') {
      this.activeDialogue = null;
      this.scopeCreepDone = true;
      this.currentState = GameState.ScopeCreepComplete1;
      this.showDialogue({ character: '', text: this.t('puzzles.scopeCreep.afterCallThought1'), id: 'scope-complete-1' });
      return;
    }
    if (id === 'scope-complete-1') {
      this.activeDialogue = null;
      this.currentState = GameState.ScopeCreepComplete2;
      this.showDialogue({ character: '', text: this.t('puzzles.scopeCreep.afterCallThought2'), id: 'scope-complete-2' });
      return;
    }
    if (id === 'scope-complete-2') {
      this.activeDialogue = null;
      this.currentState = GameState.ExploreDesk;
      this.goBack();
      setTimeout(() => this.showHintPulse(), ESCAPE_ROOM_TIMING.zoomOutDelay + 100);
      return;
    }
    if (id === 'calendar-thought') {
      this.activeDialogue = null;
      this.currentState = GameState.ExploreDesk;
      this.goBack();
      setTimeout(() => this.triggerCarolineKnock(), ESCAPE_ROOM_TIMING.zoomOutDelay + 200);
      return;
    }
    if (id === 'caroline-knock') {
      this.activeDialogue = null;
      this.showHintPulse();
      return;
    }
    if (id && id.startsWith('caroline-reply-')) {
      this.activeDialogue = null;
      this.advanceCarolineConversation();
      return;
    }
    if (id && id.startsWith('caroline-')) {
      // NPC line - do not dismiss to reply; reply button still active
      return;
    }
    this.activeDialogue = null;
  }

  // ── Skip-puzzle handlers ──
  public skipReport(): void {
    this.recordPuzzleScore('read_report', 99, true);
    this.activeDialogue = null;
    this.isReportOpen = false;
    this.reportRead = true;
    this.currentState = GameState.ExploreDesk;
    this.currentView = 'main';
    this.updateBackground();
  }

  public skipObjective(): void {
    this.recordPuzzleScore('objective', 99, true);
    for (const n of this.objectiveNotes) n.selected = n.correct;
    this.objectiveSubmitted = true;
    this.objectiveDone = true;
    this.activeDialogue = null;
    this.currentState = GameState.ExploreDesk;
    this.currentView = 'main';
    this.updateBackground();
  }

  public skipEmails(): void {
    this.recordPuzzleScore('emails', 99, true);
    for (const e of this.emails) e.read = true;
    this.currentEmail = null;
    this.emailsDone = true;
    this.activeDialogue = null;
    this.currentView = 'main';
    this.updateBackground();
    setTimeout(() => this.triggerPhoneCall(), 200);
  }

  public skipScope(): void {
    this.recordPuzzleScore('scope_creep', 99, true);
    this.scopeCreepDone = true;
    this.activeDialogue = null;
    this.currentState = GameState.ExploreDesk;
    this.currentView = 'main';
    this.updateBackground();
  }

  public skipCaroline(): void {
    if (this.currentState !== GameState.CarolineConversation && this.currentState !== GameState.CarolineArrived) return;
    this.recordPuzzleScore('caroline', 99, true);
    this.carolineDone = true;
    this.activeDialogue = null;
    this.conversationShowReply = false;
    this.finalizeAndReportScore();
    this.currentState = GameState.DoorOpen;
    this.isDoorOpen = true;
    this.updateBackground();
    this.playDoorSound();
    setTimeout(() => this.isGameCompleteOverlayVisible = true, 600);
  }

  // ── Hints ──
  protected override getHintText(): string {
    switch (this.currentState) {
      case GameState.Intro:
      case GameState.ExploreDesk: {
        if (!this.reportRead) return this.t('hints.readReport');
        if (this.reportRead && !this.objectiveDone) return this.t('hints.afterReport');
        if (this.objectiveDone && !this.emailsDone) return this.t('hints.emails');
        if (this.emailsDone && !this.scopeCreepDone) return this.t('hints.phone');
        if (this.scopeCreepDone && !this.calendarDone) return this.t('hints.calendar');
        return this.t('hints.default');
      }
      case GameState.ReadReport: return this.t('hints.closeReport');
      case GameState.OpenNotes:
      case GameState.ObjectiveSelect: return this.t('hints.objective');
      case GameState.ObjectivePickDeadline: return this.t('hints.pickDeadline');
      case GameState.OpenLaptop:
      case GameState.EmailsRead: return this.t('hints.readEmails');
      case GameState.EmailsReply: return this.t('hints.chooseReply');
      case GameState.PhoneRinging: return this.t('hints.phone');
      case GameState.ScopeCreepReply: return this.t('hints.phoneReply');
      case GameState.CalendarThought: return this.t('hints.calendar');
      case GameState.CarolineKnock: return this.t('hints.doorKnock');
      case GameState.CarolineArrived: return this.t('hints.talkCaroline');
      case GameState.DoorOpen: return this.t('hints.completion');
      default: return this.t('hints.default');
    }
  }
}

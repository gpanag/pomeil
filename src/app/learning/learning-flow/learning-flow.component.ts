import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { Router } from '@angular/router';
import { LearningFlowService } from '../learning-flow.service';
import { RoomScore } from '../../shared/escape-room/escape-room-scoring.interfaces';
import { TranslateService } from '../../translate/translate.service';

interface SkillOption {
  id: string;
  name: string;
  title: string;
  image: string;
  selected: boolean;
}

@Component({
    selector: 'app-learning-flow',
    templateUrl: './learning-flow.component.html',
    styleUrls: ['./learning-flow.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class LearningFlowComponent implements OnInit, AfterViewInit {
  @ViewChild('stepper') stepper!: MatStepper;

  skills: SkillOption[] = [
    { id: 'cultural-awareness', name: 'cultural-awareness', title: 'Cultural Awareness', image: 'assets/thumbs/cultural-awareness.webp', selected: false },
    { id: 'empathy', name: 'empathy', title: 'Empathy', image: 'assets/thumbs/empathy.webp', selected: false },
    { id: 'strategic-thinking', name: 'strategic-thinking', title: 'Strategic Thinking', image: 'assets/thumbs/strategic-thinking.webp', selected: false },
    { id: 'open-mindedness', name: 'open-mindedness', title: 'Open-Mindedness', image: 'assets/thumbs/open-mindedness.webp', selected: false },
    { id: 'financial', name: 'financial', title: 'Financial Literacy', image: 'assets/thumbs/financial.webp', selected: false },
    { id: 'stress-management', name: 'stress-management', title: 'Stress Management', image: 'assets/thumbs/stress-management.webp', selected: false },
    { id: 'trust-building', name: 'trust-building', title: 'Trust Building', image: 'assets/thumbs/trust-building.webp', selected: false },
    { id: 'active-listening', name: 'active-listening', title: 'Active Listening', image: 'assets/thumbs/active-listening.webp', selected: false },
    { id: 'adaptability', name: 'adaptability', title: 'Adaptability', image: 'assets/thumbs/adaptability.webp', selected: false },
    { id: 'flexibility', name: 'flexibility', title: 'Flexibility', image: 'assets/thumbs/flexibility.webp', selected: false },
    { id: 'interpersonal-skills', name: 'interpersonal-skills', title: 'Interpersonal Skills', image: 'assets/thumbs/interpersonal-skills.webp', selected: false },
    { id: 'language-skills', name: 'language-skills', title: 'Language Skills', image: 'assets/thumbs/language-skills.webp', selected: false },
    { id: 'resilience', name: 'resilience', title: 'Resilience', image: 'assets/thumbs/resilience.webp', selected: false },
    { id: 'self-reliance', name: 'self-reliance', title: 'Self-Reliance', image: 'assets/thumbs/self-reliance.webp', selected: false },
    { id: 'teamwork', name: 'teamwork', title: 'Teamwork', image: 'assets/thumbs/teamwork.webp', selected: false },
    { id: 'tolerance', name: 'tolerance', title: 'Tolerance', image: 'assets/thumbs/tolerance.webp', selected: false },
    { id: 'crm', name: 'crm', title: 'Customer Relationship Management', image: 'assets/thumbs/crm.webp', selected: false },
    { id: 'decision-making', name: 'decision-making', title: 'Decision-making', image: 'assets/thumbs/decision-making.webp', selected: false },
    { id: 'leadership', name: 'leadership', title: 'Leadership', image: 'assets/thumbs/leadership.webp', selected: false },
    { id: 'legal-compliance', name: 'legal-compliance', title: 'Legal Compliance', image: 'assets/thumbs/legal-compliance.webp', selected: false },
    { id: 'market-awareness', name: 'market-awareness', title: 'Market Awareness', image: 'assets/thumbs/market-awareness.webp', selected: false },
    { id: 'motivating-others', name: 'motivating-others', title: 'Motivating & Inspiring Others', image: 'assets/thumbs/motivating-others.webp', selected: false },
    { id: 'business-planning', name: 'business-planning', title: 'Business Planning', image: 'assets/thumbs/business-planning.webp', selected: false },
    { id: 'critical-thinking', name: 'critical-thinking', title: 'Critical Thinking', image: 'assets/thumbs/critical-thinking.webp', selected: false },
    { id: 'digital-skills', name: 'digital-skills', title: 'Digital Skills', image: 'assets/thumbs/digital-skills.webp', selected: false },
    { id: 'negotiation-skills', name: 'negotiation-skills', title: 'Negotiation Skills', image: 'assets/thumbs/negotiation-skills.webp', selected: false },
    { id: 'networking-skills', name: 'networking-skills', title: 'Networking Skills', image: 'assets/thumbs/networking-skills.webp', selected: false },
    { id: 'risk-management', name: 'risk-management', title: 'Risk Management', image: 'assets/thumbs/risk-management.webp', selected: false },
    { id: 'problem-solving', name: 'problem-solving', title: 'Problem Solving', image: 'assets/thumbs/problem-solving.webp', selected: false },
    { id: 'project-management', name: 'project-management', title: 'Project Management', image: 'assets/thumbs/project-management.webp', selected: false },
  ];

  selectedSkillIds: string[] = [];
  flowStarted = false;
  questionnaireCompleted = false;

  /** Skills with an interactive flipbook curriculum available. */
  private readonly flipbookSkillIds = new Set<string>(['business-planning']);

  hasFlipbook(skillId: string): boolean {
    return this.flipbookSkillIds.has(skillId);
  }

  // Module PDF URLs by skill ID
  modulePdfUrls: { [id: string]: string } = {
    'cultural-awareness': 'assets/modules/cultural-awareness.pdf',
    'empathy': 'assets/modules/empathy.pdf',
    'strategic-thinking': 'assets/modules/strategic-thinking.pdf',
    'open-mindedness': 'assets/modules/open-mindedness.pdf',
    'financial': 'assets/modules/financial.pdf',
    'stress-management': 'assets/modules/stress-management.pdf',
    'trust-building': 'assets/modules/trust-building.pdf',
    'active-listening': 'assets/modules/active-listening.pdf',
    'adaptability': 'assets/modules/adaptability.pdf',
    'flexibility': 'assets/modules/flexibility.pdf',
    'interpersonal-skills': 'assets/modules/interpersonal-skills.pdf',
    'language-skills': 'assets/modules/language-skills.pdf',
    'resilience': 'assets/modules/resilience.pdf',
    'self-reliance': 'assets/modules/self-reliance.pdf',
    'teamwork': 'assets/modules/teamwork.pdf',
    'tolerance': 'assets/modules/tolerance.pdf',
    'crm': 'assets/modules/crm.pdf',
    'decision-making': 'assets/modules/decision-making.pdf',
    'leadership': 'assets/modules/leadership.pdf',
    'legal-compliance': 'assets/modules/legal-compliance.pdf',
    'market-awareness': 'assets/modules/market-awareness.pdf',
    'motivating-others': 'assets/modules/motivating-others.pdf',
    'business-planning': 'assets/modules/business-planning.pdf',
    'critical-thinking': 'assets/modules/critical-thinking.pdf',
    'digital-skills': 'assets/modules/digital-skills.pdf',
    'negotiation-skills': 'assets/modules/negotiation-skills.pdf',
    'networking-skills': 'assets/modules/networking-skills.pdf',
    'risk-management': 'assets/modules/risk-management.pdf',
    'problem-solving': 'assets/modules/problem-solving.pdf',
    'project-management': 'assets/modules/project-management.pdf',
  };

  constructor(
    private learningService: LearningFlowService,
    private router: Router,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    const state = this.learningService.getState();
    if (state.selectedSkills.length > 0) {
      this.selectedSkillIds = [...state.selectedSkills];
      this.skills.forEach(s => s.selected = this.selectedSkillIds.includes(s.id));
      this.flowStarted = true;
      this.questionnaireCompleted = state.questionnaireCompleted;
    }
  }

  ngAfterViewInit(): void {
    if (this.flowStarted) {
      setTimeout(() => this.restoreStepperPosition(), 0);
    }
  }

  get anySkillSelected(): boolean {
    return this.skills.some(s => s.selected);
  }

  toggleSkill(skill: SkillOption): void {
    skill.selected = !skill.selected;
  }

  startFlow(): void {
    this.selectedSkillIds = this.skills.filter(s => s.selected).map(s => s.id);
    this.learningService.setSelectedSkills(this.selectedSkillIds);
    this.flowStarted = true;
    setTimeout(() => {
      if (this.stepper) this.stepper.next();
    }, 0);
  }

  getSkillTitle(skillId: string): string {
    const fallback = this.skills.find(s => s.id === skillId)?.title || skillId;
    return this.translate.instant('SKILLS.' + skillId) ?? fallback;
  }


  getSkillImage(skillId: string): string {
    return this.skills.find(s => s.id === skillId)?.image ?? '';
  }

  getRoomScore(skillId: string): RoomScore | undefined {
    return this.learningService.getRoomScore(skillId);
  }

  getPuzzleScoreValue(ps: any): number {
    if (typeof ps === 'number') return ps;
    if (ps && typeof ps.score === 'number') return ps.score;
    return 0;
  }

  isSkillCompleted(skillId: string): boolean {
    return !!this.learningService.getRoomScore(skillId);
  }

  isModuleRequired(skillId: string): boolean {
    const score = this.getRoomScore(skillId);
    return !!score && score.overallScore < 80;
  }

  isModuleAcknowledged(skillId: string): boolean {
    return this.learningService.isModuleAcknowledged(skillId);
  }

  /** Download / "read online" links call this so a required module counts as opened. */
  onModuleOpened(skillId: string): void {
    this.learningService.markModuleAcknowledged(skillId);
  }

  /** A skill step is done when the room was played AND, if the score was
   *  below the pass mark, the module has been opened (partner feedback
   *  2026-08-31: "you must first download or read the module before
   *  proceeding to the next module"). */
  canContinue(skillId: string): boolean {
    return this.isSkillCompleted(skillId) &&
      (!this.isModuleRequired(skillId) || this.isModuleAcknowledged(skillId));
  }

  playGame(skillId: string): void {
    this.router.navigate(['/escape-rooms/' + skillId], { queryParams: { mode: 'learning' } });
  }

  goToQuestionnaire(): void {
    this.router.navigate(['/learning/questionnaire']);
  }

  get allSkillsCompleted(): boolean {
    return this.selectedSkillIds.every(id => this.canContinue(id));
  }

  get summaryScores(): { skillId: string; title: string; score: number; passed: boolean }[] {
    return this.selectedSkillIds.map(id => {
      const roomScore = this.getRoomScore(id);
      return {
        skillId: id,
        title: this.getSkillTitle(id),
        score: roomScore?.overallScore ?? 0,
        passed: (roomScore?.overallScore ?? 0) >= 80,
      };
    });
  }

  get averageScore(): number {
    const scores = this.summaryScores;
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
  }

  resetFlow(): void {
    this.learningService.resetFlow();
    this.flowStarted = false;
    this.selectedSkillIds = [];
    this.questionnaireCompleted = false;
    this.skills.forEach(s => s.selected = false);
  }

  private restoreStepperPosition(): void {
    if (!this.stepper) return;
    const state = this.learningService.getState();

    // Temporarily disable linear mode to allow programmatic navigation
    this.stepper.linear = false;

    if (state.questionnaireCompleted) {
      // Go to summary step (last)
      const totalSteps = 1 + this.selectedSkillIds.length + 1 + 1;
      this.stepper.selectedIndex = totalSteps - 1;
      this.stepper.linear = true;
      return;
    }

    // Go to the first skill step that is not fully done (played + module gate)
    let targetStep = 1;
    for (let i = 0; i < this.selectedSkillIds.length; i++) {
      if (!this.canContinue(this.selectedSkillIds[i])) {
        targetStep = i + 1;
        break;
      }
      targetStep = i + 2;
    }
    this.stepper.selectedIndex = targetStep;
    this.stepper.linear = true;
  }
}

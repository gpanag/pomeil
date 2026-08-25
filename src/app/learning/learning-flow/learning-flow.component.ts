import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { Router } from '@angular/router';
import { LearningFlowService } from '../learning-flow.service';
import { RoomScore } from '../../shared/escape-room/escape-room-scoring.interfaces';

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
})
export class LearningFlowComponent implements OnInit, AfterViewInit {
  @ViewChild('stepper') stepper!: MatStepper;

  skills: SkillOption[] = [
    { id: 'cultural-awareness', name: 'cultural-awareness', title: 'Cultural Awareness', image: 'assets/images/escape_room_raw_empty_final_people_zoomed_good_2.png', selected: false },
    { id: 'empathy', name: 'empathy', title: 'Empathy', image: 'assets/images/empathy/meditation_room.png', selected: false },
    { id: 'strategic-thinking', name: 'strategic-thinking', title: 'Strategic Thinking', image: 'assets/images/strategic/base_room.png', selected: false },
    { id: 'open-mindedness', name: 'open-mindedness', title: 'Open-Mindedness', image: 'assets/images/open_mindedness/cafeteria_base.png', selected: false },
    { id: 'financial', name: 'financial', title: 'Financial Literacy', image: 'assets/images/financial/accountant_office_base.png', selected: false },
    { id: 'stress-management', name: 'stress-management', title: 'Stress Management', image: 'assets/images/stress_management/panic_room.png', selected: false },
    { id: 'trust-building', name: 'trust-building', title: 'Trust Building', image: 'assets/images/trust_building/hr_office.png', selected: false },
    { id: 'active-listening', name: 'active-listening', title: 'Active Listening', image: 'assets/images/active_listening/rooftop_default.png', selected: false },
    { id: 'adaptability', name: 'adaptability', title: 'Adaptability', image: 'assets/images/adaptability/floor1.png', selected: false },
    { id: 'flexibility', name: 'flexibility', title: 'Flexibility', image: 'assets/images/flexibility/rnd_room_default.png', selected: false },
    { id: 'interpersonal-skills', name: 'interpersonal-skills', title: 'Interpersonal Skills', image: 'assets/images/interpersonal_skills/reception_default.png', selected: false },
    { id: 'language-skills', name: 'language-skills', title: 'Language Skills', image: 'assets/images/language_skills/waiting_room_default.png', selected: false },
    { id: 'resilience', name: 'resilience', title: 'Resilience', image: 'assets/images/resilience/archive_room_default.png', selected: false },
    { id: 'self-reliance', name: 'self-reliance', title: 'Self-Reliance', image: 'assets/images/self_reliance/rooftop_default.png', selected: false },
    { id: 'teamwork', name: 'teamwork', title: 'Teamwork', image: 'assets/images/teamwork/coworking_room_default.png', selected: false },
    { id: 'tolerance', name: 'tolerance', title: 'Tolerance', image: 'assets/images/tolerance/coworking_office_default.png', selected: false },
    { id: 'crm', name: 'crm', title: 'Customer Relationship Management', image: 'assets/images/crm/customer_service_dept_default.png', selected: false },
    { id: 'decision-making', name: 'decision-making', title: 'Decision-making', image: 'assets/images/decision_making/outside_elevator.png', selected: false },
    { id: 'leadership', name: 'leadership', title: 'Leadership', image: 'assets/images/leadership/hr_waiting_room_default.png', selected: false },
    { id: 'legal-compliance', name: 'legal-compliance', title: 'Legal Compliance', image: 'assets/images/legal_compliance/legal_dept_default.png', selected: false },
    { id: 'market-awareness', name: 'market-awareness', title: 'Market Awareness', image: 'assets/images/market_awareness/marketing_office_default.png', selected: false },
    { id: 'motivating-others', name: 'motivating-others', title: 'Motivating & Inspiring Others', image: 'assets/images/motivating_others/waiting_area_default.png', selected: false },
    { id: 'business-planning', name: 'business-planning', title: 'Business Planning', image: 'assets/images/business_planning/conference_room.png', selected: false },
    { id: 'critical-thinking', name: 'critical-thinking', title: 'Critical Thinking', image: 'assets/images/critical_thinking/waiting_room_default.png', selected: false },
    { id: 'digital-skills', name: 'digital-skills', title: 'Digital Skills', image: 'assets/images/digital_skills/it_department.png', selected: false },
    { id: 'negotiation-skills', name: 'negotiation-skills', title: 'Negotiation Skills', image: 'assets/images/negotiation_skills/interview_room_default.png', selected: false },
    { id: 'networking-skills', name: 'networking-skills', title: 'Networking Skills', image: 'assets/images/networking_skills/waiting_room_default.png', selected: false },
    { id: 'risk-management', name: 'risk-management', title: 'Risk Management', image: 'assets/images/risk_management/janitor_closet.png', selected: false },
    { id: 'problem-solving', name: 'problem-solving', title: 'Problem Solving', image: 'assets/images/problem_solving/storage_room.png', selected: false },
    { id: 'project-management', name: 'project-management', title: 'Project Management', image: 'assets/images/project_management/office_room.png', selected: false },
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
    return this.skills.find(s => s.id === skillId)?.title ?? skillId;
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

  playGame(skillId: string): void {
    this.router.navigate(['/escape-rooms/' + skillId], { queryParams: { mode: 'learning' } });
  }

  goToQuestionnaire(): void {
    this.router.navigate(['/learning/questionnaire']);
  }

  get allSkillsCompleted(): boolean {
    return this.selectedSkillIds.every(id => this.isSkillCompleted(id));
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

    // Go to the first incomplete skill step (step index 1+)
    let targetStep = 1;
    for (let i = 0; i < this.selectedSkillIds.length; i++) {
      if (!this.isSkillCompleted(this.selectedSkillIds[i])) {
        targetStep = i + 1;
        break;
      }
      targetStep = i + 2;
    }
    this.stepper.selectedIndex = targetStep;
    this.stepper.linear = true;
  }
}

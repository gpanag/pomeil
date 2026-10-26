import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { LearningFlowService } from '../learning-flow.service';
import { RoomScore } from '../../shared/escape-room/escape-room-scoring.interfaces';
import { TranslateService } from '../../translate/translate.service';
import { dateLocale } from '../../shared/app-locales';

interface SkillInfo {
  id: string;
  title: string;
  image: string;
}

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class DashboardComponent implements OnInit {
  /** DatePipe locale for the current UI language (ee→et, gr→el, ua→uk). */
  get dateLocale(): string { return dateLocale(this.translate.getLang()); }

  skills: SkillInfo[] = [
    { id: 'cultural-awareness', title: 'Cultural Awareness', image: 'assets/thumbs/cultural-awareness.webp' },
    { id: 'empathy', title: 'Empathy', image: 'assets/thumbs/empathy.webp' },
    { id: 'strategic-thinking', title: 'Strategic Thinking', image: 'assets/thumbs/strategic-thinking.webp' },
    { id: 'open-mindedness', title: 'Open-Mindedness', image: 'assets/thumbs/open-mindedness.webp' },
    { id: 'financial', title: 'Financial Literacy', image: 'assets/thumbs/financial.webp' },
    { id: 'stress-management', title: 'Stress Management', image: 'assets/thumbs/stress-management.webp' },
    { id: 'trust-building', title: 'Trust Building', image: 'assets/thumbs/trust-building.webp' },
    { id: 'active-listening', title: 'Active Listening', image: 'assets/thumbs/active-listening.webp' },
    { id: 'adaptability', title: 'Adaptability', image: 'assets/thumbs/adaptability.webp' },
    { id: 'flexibility', title: 'Flexibility', image: 'assets/thumbs/flexibility.webp' },
    { id: 'interpersonal-skills', title: 'Interpersonal Skills', image: 'assets/thumbs/interpersonal-skills.webp' },
    { id: 'language-skills', title: 'Language Skills', image: 'assets/thumbs/language-skills.webp' },
    { id: 'resilience', title: 'Resilience', image: 'assets/thumbs/resilience.webp' },
    { id: 'self-reliance', title: 'Self-Reliance', image: 'assets/thumbs/self-reliance.webp' },
    { id: 'teamwork', title: 'Teamwork', image: 'assets/thumbs/teamwork.webp' },
    { id: 'tolerance', title: 'Tolerance', image: 'assets/thumbs/tolerance.webp' },
    { id: 'crm', title: 'Customer Relationship Management', image: 'assets/thumbs/crm.webp' },
    { id: 'decision-making', title: 'Decision-making', image: 'assets/thumbs/decision-making.webp' },
    { id: 'leadership', title: 'Leadership', image: 'assets/thumbs/leadership.webp' },
    { id: 'legal-compliance', title: 'Legal Compliance', image: 'assets/thumbs/legal-compliance.webp' },
    { id: 'market-awareness', title: 'Market Awareness', image: 'assets/thumbs/market-awareness.webp' },
    { id: 'motivating-others', title: 'Motivating & Inspiring Others', image: 'assets/thumbs/motivating-others.webp' },
    { id: 'business-planning', title: 'Business Planning', image: 'assets/thumbs/business-planning.webp' },
    { id: 'critical-thinking', title: 'Critical Thinking', image: 'assets/thumbs/critical-thinking.webp' },
    { id: 'digital-skills', title: 'Digital Skills', image: 'assets/thumbs/digital-skills.webp' },
    { id: 'negotiation-skills', title: 'Negotiation Skills', image: 'assets/thumbs/negotiation-skills.webp' },
    { id: 'networking-skills', title: 'Networking Skills', image: 'assets/thumbs/networking-skills.webp' },
    { id: 'risk-management', title: 'Risk Management', image: 'assets/thumbs/risk-management.webp' },
    { id: 'problem-solving', title: 'Problem Solving', image: 'assets/thumbs/problem-solving.webp' },
    { id: 'project-management', title: 'Project Management', image: 'assets/thumbs/project-management.webp' },
  ];

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

  roomScores: { [roomId: string]: RoomScore } = {};

  private translate = inject(TranslateService);

  /** Localised skill name from app i18n `SKILLS.<id>`; falls back to the
   *  English title in `skills` (partner feedback 2026-08-31). */
  skillTitle(skill: SkillInfo): string {
    return this.translate.instant('SKILLS.' + skill.id) ?? skill.title;
  }

  constructor(
    private learningService: LearningFlowService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.roomScores = this.learningService.getAllRoomScores();
  }

  getRoomScore(skillId: string): RoomScore | undefined {
    return this.roomScores[skillId];
  }

  isCompleted(skillId: string): boolean {
    return !!this.roomScores[skillId];
  }

  isModuleRequired(skillId: string): boolean {
    const score = this.roomScores[skillId];
    return !!score && score.overallScore < 80;
  }

  get completedCount(): number {
    return this.skills.filter(s => this.isCompleted(s.id)).length;
  }

  get overallAverage(): number {
    const completed = this.skills.filter(s => this.isCompleted(s.id));
    if (completed.length === 0) return 0;
    const total = completed.reduce((sum, s) => sum + this.roomScores[s.id].overallScore, 0);
    return Math.round(total / completed.length);
  }

  get modulesRequiredCount(): number {
    return this.skills.filter(s => this.isModuleRequired(s.id)).length;
  }

  get hasAnyCompleted(): boolean {
    return this.completedCount > 0;
  }

  /** True only when every skill the user selected has been completed. */
  get hasCompletedAllSelected(): boolean {
    const selected = this.learningService.getSelectedSkills() || [];
    if (selected.length === 0) return false;
    return selected.every(id => !!this.roomScores[id]);
  }

  getPuzzleScoreValue(ps: any): number {
    // puzzleScores can be PuzzleScore objects or plain numbers
    if (typeof ps === 'number') return ps;
    if (ps && typeof ps.score === 'number') return ps.score;
    return 0;
  }

  playGame(skillId: string): void {
    this.router.navigate(['/escape-rooms/' + skillId], { queryParams: { mode: 'learning' } });
  }
}

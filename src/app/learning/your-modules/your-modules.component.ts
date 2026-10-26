import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { LearningFlowService } from '../learning-flow.service';
import { TranslateService } from '../../translate/translate.service';

/** Languages for which we have a translated PDF set under `assets/modules/{lang}/`. */
const TRANSLATED_PDF_LANGS = new Set<string>(['pl']);

interface SkillModule {
  id: string;
  title: string;
  description: string;
  image: string;
  pdfUrl: string;
}

interface PlayedModule extends SkillModule {
  score: number;
  played: boolean;
}

@Component({
    selector: 'app-your-modules',
    templateUrl: './your-modules.component.html',
    styleUrls: ['./your-modules.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class YourModulesComponent implements OnInit {

  // Full catalog (kept in sync with ModulesLibraryComponent / DashboardComponent)
  private allModules: SkillModule[] = [
    { id: 'cultural-awareness', title: 'Cultural Awareness',
      description: 'Understanding and respecting cultural differences in the workplace, including communication styles, customs, and social norms across cultures.',
      image: 'assets/thumbs/cultural-awareness.webp',
      pdfUrl: 'assets/modules/cultural-awareness.pdf' },
    { id: 'empathy', title: 'Empathy',
      description: 'Developing the ability to recognize and understand the emotions and perspectives of others.',
      image: 'assets/thumbs/empathy.webp', pdfUrl: 'assets/modules/empathy.pdf' },
    { id: 'strategic-thinking', title: 'Strategic Thinking',
      description: 'Analyzing situations, considering long-term impacts, and aligning decisions with team goals.',
      image: 'assets/thumbs/strategic-thinking.webp', pdfUrl: 'assets/modules/strategic-thinking.pdf' },
    { id: 'open-mindedness', title: 'Open-Mindedness',
      description: 'Cultivating openness to new ideas, diverse perspectives, and constructive feedback.',
      image: 'assets/thumbs/open-mindedness.webp', pdfUrl: 'assets/modules/open-mindedness.pdf' },
    { id: 'financial', title: 'Financial Literacy',
      description: 'Understanding budgeting, cash flow, invoicing, and financial planning.',
      image: 'assets/thumbs/financial.webp', pdfUrl: 'assets/modules/financial.pdf' },
    { id: 'stress-management', title: 'Stress Management',
      description: 'Recognising, managing, and reducing stress at work — mindfulness, boundaries, resilience.',
      image: 'assets/thumbs/stress-management.webp', pdfUrl: 'assets/modules/stress-management.pdf' },
    { id: 'trust-building', title: 'Trust Building',
      description: 'Building trust within teams through transparency, empathy, and consistent leadership.',
      image: 'assets/thumbs/trust-building.webp', pdfUrl: 'assets/modules/trust-building.pdf' },
    { id: 'active-listening', title: 'Active Listening',
      description: 'Being fully present in conversations and responding thoughtfully.',
      image: 'assets/thumbs/active-listening.webp', pdfUrl: 'assets/modules/active-listening.pdf' },
    { id: 'adaptability', title: 'Adaptability',
      description: 'Adjusting your approach when circumstances change, balancing speed with judgment.',
      image: 'assets/thumbs/adaptability.webp', pdfUrl: 'assets/modules/adaptability.pdf' },
    { id: 'flexibility', title: 'Flexibility',
      description: 'Responding quickly to change and finding new solutions under pressure.',
      image: 'assets/thumbs/flexibility.webp', pdfUrl: 'assets/modules/flexibility.pdf' },
    { id: 'interpersonal-skills', title: 'Interpersonal Skills',
      description: 'Communication, teamwork, emotional intelligence, and problem-solving.',
      image: 'assets/thumbs/interpersonal-skills.webp', pdfUrl: 'assets/modules/interpersonal-skills.pdf' },
    { id: 'language-skills', title: 'Language Skills',
      description: 'Effective communication in international professional environments.',
      image: 'assets/thumbs/language-skills.webp', pdfUrl: 'assets/modules/language-skills.pdf' },
    { id: 'resilience', title: 'Resilience',
      description: 'Recovering from setbacks and maintaining effectiveness under pressure.',
      image: 'assets/thumbs/resilience.webp', pdfUrl: 'assets/modules/resilience.pdf' },
    { id: 'self-reliance', title: 'Self-Reliance',
      description: 'Independence, initiative, and confidence to solve problems autonomously.',
      image: 'assets/thumbs/self-reliance.webp', pdfUrl: 'assets/modules/self-reliance.pdf' },
    { id: 'teamwork', title: 'Teamwork',
      description: 'Working effectively with others toward shared goals.',
      image: 'assets/thumbs/teamwork.webp', pdfUrl: 'assets/modules/teamwork.pdf' },
    { id: 'tolerance', title: 'Tolerance',
      description: 'Understanding and accepting diversity, practicing inclusion.',
      image: 'assets/thumbs/tolerance.webp', pdfUrl: 'assets/modules/tolerance.pdf' },
    { id: 'crm', title: 'Customer Relationship Management',
      description: 'Managing customer interactions, handling complaints, building long-term relationships.',
      image: 'assets/thumbs/crm.webp', pdfUrl: 'assets/modules/crm.pdf' },
    { id: 'decision-making', title: 'Decision-making',
      description: 'Identifying alternatives and selecting the best course of action under uncertainty.',
      image: 'assets/thumbs/decision-making.webp', pdfUrl: 'assets/modules/decision-making.pdf' },
    { id: 'leadership', title: 'Leadership',
      description: 'Empathy, accountability, communication, and team management.',
      image: 'assets/thumbs/leadership.webp', pdfUrl: 'assets/modules/leadership.pdf' },
    { id: 'legal-compliance', title: 'Legal Compliance',
      description: 'Document classification, regulations, and red-flag detection.',
      image: 'assets/thumbs/legal-compliance.webp', pdfUrl: 'assets/modules/legal-compliance.pdf' },
    { id: 'market-awareness', title: 'Market Awareness',
      description: 'Customer segments, SWOT analysis, and competitive thinking.',
      image: 'assets/thumbs/market-awareness.webp', pdfUrl: 'assets/modules/market-awareness.pdf' },
    { id: 'motivating-others', title: 'Motivating & Inspiring Others',
      description: 'Building confidence and engagement through small, intentional actions.',
      image: 'assets/thumbs/motivating-others.webp', pdfUrl: 'assets/modules/motivating-others.pdf' },
    { id: 'business-planning', title: 'Business Planning',
      description: 'Customer segments, value proposition, channels, revenue, and costs — the Business Model Canvas.',
      image: 'assets/thumbs/business-planning.webp', pdfUrl: 'assets/modules/business-planning.pdf' },
    { id: 'critical-thinking', title: 'Critical Thinking',
      description: 'Evidence-based reasoning, separating facts from assumptions, structured investigation.',
      image: 'assets/thumbs/critical-thinking.webp', pdfUrl: 'assets/modules/critical-thinking.pdf' },
    { id: 'digital-skills', title: 'Digital Skills',
      description: 'Cybersecurity, password hygiene, phishing detection, social media safety.',
      image: 'assets/thumbs/digital-skills.webp', pdfUrl: 'assets/modules/digital-skills.pdf' },
    { id: 'negotiation-skills', title: 'Negotiation Skills',
      description: 'Preparation, active listening, principled bargaining, and BATNA.',
      image: 'assets/thumbs/negotiation-skills.webp', pdfUrl: 'assets/modules/negotiation-skills.pdf' },
    { id: 'networking-skills', title: 'Networking Skills',
      description: 'Building authentic professional relationships and reading social cues.',
      image: 'assets/thumbs/networking-skills.webp', pdfUrl: 'assets/modules/networking-skills.pdf' },
    { id: 'risk-management', title: 'Risk Management',
      description: 'Identifying hazards, assessing impact and likelihood, and mitigation planning.',
      image: 'assets/thumbs/risk-management.webp', pdfUrl: 'assets/modules/risk-management.pdf' },
    { id: 'problem-solving', title: 'Problem Solving',
      description: 'Defining problems, root-cause analysis, structured investigation.',
      image: 'assets/thumbs/problem-solving.webp', pdfUrl: 'assets/modules/problem-solving.pdf' },
    { id: 'project-management', title: 'Project Management',
      description: 'Scope, schedule, risk, communication, and stakeholder management.',
      image: 'assets/thumbs/project-management.webp', pdfUrl: 'assets/modules/project-management.pdf' },
  ];

  yourModules: PlayedModule[] = [];

  private translate = inject(TranslateService);

  constructor(private learningService: LearningFlowService) {}

  /** Localised skill name from app i18n `SKILLS.<id>`; falls back to the
   *  English title in the catalog (partner feedback 2026-08-31). */
  skillTitle(mod: { id: string; title: string }): string {
    return this.translate.instant('SKILLS.' + mod.id) ?? mod.title;
  }

  /** Localized module description, English fallback — see modules-library. */
  skillDescription(mod: { id: string; description: string }): string {
    return this.translate.instant('SKILL_DESC.' + mod.id) ?? mod.description;
  }

  /** Use the Polish translation when the active language is pl; English otherwise. */
  pdfUrlFor(mod: { id: string; pdfUrl: string }): string {
    const lang = this.translate.getLang?.() || 'en';
    if (TRANSLATED_PDF_LANGS.has(lang)) {
      return `assets/modules/${lang}/${mod.id}.pdf`;
    }
    return mod.pdfUrl;
  }

  ngOnInit(): void {
    const state = this.learningService.getState();
    const selected = new Set<string>(state.selectedSkills || []);
    const scores = state.roomScores || {};

    // Include any module the user has selected OR played (has a score)
    this.yourModules = this.allModules
      .filter(m => selected.has(m.id) || scores[m.id])
      .map(m => ({
        ...m,
        score: scores[m.id]?.overallScore ?? 0,
        played: !!scores[m.id]
      }))
      // Played first, then unplayed-but-selected
      .sort((a, b) => Number(b.played) - Number(a.played));
  }

  scoreClass(score: number): string {
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-mid';
    return 'score-low';
  }
}

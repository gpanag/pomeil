import { Component, inject } from '@angular/core';
import { TranslateService } from '../../translate/translate.service';

interface SkillModule {
  id: string;
  title: string;
  description: string;
  image: string;
  /** English-default PDF path. Polish builds resolve to `assets/modules/pl/{id}.pdf`
   *  via `pdfUrlFor()` — see translation work, 2026-05-09. */
  pdfUrl: string;
  /** When set, an additional "Read the module" link is rendered. */
  hasFlipbook?: boolean;
}

/** Languages for which we have a translated PDF set under `assets/modules/{lang}/`. */
const TRANSLATED_PDF_LANGS = new Set<string>(['pl']);

@Component({
  selector: 'app-modules-library',
  templateUrl: './modules-library.component.html',
  styleUrls: ['./modules-library.component.scss'],
})
export class ModulesLibraryComponent {

  /** Full curriculum document (all modules combined). Featured at top. */
  fullCurriculumPdfUrl = 'assets/modules/POMEIL_Curriculum_Full.pdf';

  /** IDs of skills that have an interactive flipbook curriculum available.
   *  Every module now has a flipbook (business-planning is hand-authored;
   *  the other 29 are auto-extracted from the partner curriculum PDFs). */
  private readonly flipbookSkillIds = new Set<string>([
    'business-planning', 'critical-thinking', 'crm', 'decision-making',
    'digital-skills', 'financial', 'leadership', 'legal-compliance',
    'market-awareness', 'motivating-others', 'negotiation-skills',
    'networking-skills', 'problem-solving', 'project-management',
    'risk-management', 'strategic-thinking', 'stress-management',
    'trust-building', 'active-listening', 'adaptability', 'cultural-awareness',
    'empathy', 'flexibility', 'interpersonal-skills', 'language-skills',
    'open-mindedness', 'resilience', 'self-reliance', 'teamwork', 'tolerance',
  ]);

  modules: SkillModule[] = [
    {
      id: 'cultural-awareness',
      title: 'Cultural Awareness',
      description: 'Understanding and respecting cultural differences in the workplace, including communication styles, customs, and social norms across cultures.',
      image: 'assets/thumbs/cultural-awareness.webp',
      pdfUrl: 'assets/modules/cultural-awareness.pdf',
    },
    {
      id: 'empathy',
      title: 'Empathy',
      description: 'Developing the ability to recognize and understand the emotions and perspectives of others, and responding with compassion in professional settings.',
      image: 'assets/thumbs/empathy.webp',
      pdfUrl: 'assets/modules/empathy.pdf',
    },
    {
      id: 'strategic-thinking',
      title: 'Strategic Thinking',
      description: 'Learning to analyze situations, consider long-term impacts, and make decisions that align with organizational goals and team collaboration.',
      image: 'assets/thumbs/strategic-thinking.webp',
      pdfUrl: 'assets/modules/strategic-thinking.pdf',
    },
    {
      id: 'open-mindedness',
      title: 'Open-Mindedness',
      description: 'Cultivating openness to new ideas, diverse perspectives, and constructive feedback while maintaining critical thinking abilities.',
      image: 'assets/thumbs/open-mindedness.webp',
      pdfUrl: 'assets/modules/open-mindedness.pdf',
    },
    {
      id: 'financial',
      title: 'Financial Literacy',
      description: 'Understanding basic financial concepts including budgeting, cash flow management, invoicing, and financial planning for personal and professional growth.',
      image: 'assets/thumbs/financial.webp',
      pdfUrl: 'assets/modules/financial.pdf',
    },
    {
      id: 'stress-management',
      title: 'Stress Management',
      description: 'Techniques for recognizing, managing, and reducing stress in the workplace, including mindfulness, boundary-setting, and resilience building.',
      image: 'assets/thumbs/stress-management.webp',
      pdfUrl: 'assets/modules/stress-management.pdf',
    },
    {
      id: 'trust-building',
      title: 'Trust Building',
      description: 'Building trust within teams through transparency, empathy, active listening, and consistent leadership behavior.',
      image: 'assets/thumbs/trust-building.webp',
      pdfUrl: 'assets/modules/trust-building.pdf',
    },
    {
      id: 'active-listening',
      title: 'Active Listening',
      description: 'Being fully present in conversations, understanding verbal and non-verbal cues, and responding thoughtfully to build stronger communication.',
      image: 'assets/thumbs/active-listening.webp',
      pdfUrl: 'assets/modules/active-listening.pdf',
    },
    {
      id: 'adaptability',
      title: 'Adaptability',
      description: 'Adjusting your approach when circumstances change while maintaining focus on goals, balancing speed with judgment.',
      image: 'assets/thumbs/adaptability.webp',
      pdfUrl: 'assets/modules/adaptability.pdf',
    },
    {
      id: 'flexibility',
      title: 'Flexibility',
      description: 'Responding quickly to change, managing stress, and finding new solutions under pressure in dynamic R&D environments.',
      image: 'assets/thumbs/flexibility.webp',
      pdfUrl: 'assets/modules/flexibility.pdf',
    },
    {
      id: 'interpersonal-skills',
      title: 'Interpersonal Skills',
      description: 'Communication, teamwork, emotional intelligence, and problem-solving abilities essential for effective workplace interactions.',
      image: 'assets/thumbs/interpersonal-skills.webp',
      pdfUrl: 'assets/modules/interpersonal-skills.pdf',
    },
    {
      id: 'language-skills',
      title: 'Language Skills',
      description: 'Developing receptive and productive language abilities for effective communication in international professional environments.',
      image: 'assets/thumbs/language-skills.webp',
      pdfUrl: 'assets/modules/language-skills.pdf',
    },
    {
      id: 'resilience',
      title: 'Resilience',
      description: 'Building the capacity to recover from setbacks, adapt to challenges, and maintain effectiveness under pressure.',
      image: 'assets/thumbs/resilience.webp',
      pdfUrl: 'assets/modules/resilience.pdf',
    },
    {
      id: 'self-reliance',
      title: 'Self-Reliance',
      description: 'Developing independence, initiative, and confidence to solve problems and make decisions autonomously.',
      image: 'assets/thumbs/self-reliance.webp',
      pdfUrl: 'assets/modules/self-reliance.pdf',
    },
    {
      id: 'teamwork',
      title: 'Teamwork',
      description: 'Working effectively with others, collaborating across roles, and contributing to shared goals in diverse team environments.',
      image: 'assets/thumbs/teamwork.webp',
      pdfUrl: 'assets/modules/teamwork.pdf',
    },
    {
      id: 'tolerance',
      title: 'Tolerance',
      description: 'Understanding and accepting diversity, practicing inclusion, and managing differences constructively in the workplace.',
      image: 'assets/thumbs/tolerance.webp',
      pdfUrl: 'assets/modules/tolerance.pdf',
    },
    {
      id: 'crm',
      title: 'Customer Relationship Management',
      description: 'Managing customer interactions, handling complaints, maintaining records, and building long-term customer relationships.',
      image: 'assets/thumbs/crm.webp',
      pdfUrl: 'assets/modules/crm.pdf',
    },
    {
      id: 'decision-making',
      title: 'Decision-making',
      description: 'Systematic approaches to identifying alternatives, evaluating outcomes, and selecting the best course of action under uncertainty.',
      image: 'assets/thumbs/decision-making.webp',
      pdfUrl: 'assets/modules/decision-making.pdf',
    },
    {
      id: 'leadership',
      title: 'Leadership',
      description: 'Developing leadership qualities including empathy, accountability, communication, and decision-making in team management.',
      image: 'assets/thumbs/leadership.webp',
      pdfUrl: 'assets/modules/leadership.pdf',
    },
    {
      id: 'legal-compliance',
      title: 'Legal Compliance',
      description: 'Understanding legal requirements, data protection, confidentiality, and ethical responsibilities in business operations.',
      image: 'assets/thumbs/legal-compliance.webp',
      pdfUrl: 'assets/modules/legal-compliance.pdf',
    },
    {
      id: 'market-awareness',
      title: 'Market Awareness',
      description: 'Understanding target audiences, competitor analysis, market trends, and developing unique selling propositions.',
      image: 'assets/thumbs/market-awareness.webp',
      pdfUrl: 'assets/modules/market-awareness.pdf',
    },
    {
      id: 'motivating-others',
      title: 'Motivating & Inspiring Others',
      description: 'Recognizing strengths, providing encouragement, and inspiring confidence in others through empathetic leadership.',
      image: 'assets/thumbs/motivating-others.webp',
      pdfUrl: 'assets/modules/motivating-others.pdf',
    },
    {
      id: 'business-planning',
      title: 'Business Planning',
      description: 'Developing business models, identifying customer segments, revenue streams, and creating actionable business plans.',
      image: 'assets/thumbs/business-planning.webp',
      pdfUrl: 'assets/modules/business-planning.pdf',
    },
    {
      id: 'critical-thinking',
      title: 'Critical Thinking',
      description: 'Analyzing information objectively, evaluating evidence, and making reasoned judgments to solve problems effectively.',
      image: 'assets/thumbs/critical-thinking.webp',
      pdfUrl: 'assets/modules/critical-thinking.pdf',
    },
    {
      id: 'digital-skills',
      title: 'Digital Skills',
      description: 'Navigating digital tools, cybersecurity awareness, online communication, and responsible use of technology in the workplace.',
      image: 'assets/thumbs/digital-skills.webp',
      pdfUrl: 'assets/modules/digital-skills.pdf',
    },
    {
      id: 'negotiation-skills',
      title: 'Negotiation Skills',
      description: 'Preparing for negotiations, building rapport, finding win-win solutions, and maintaining professional relationships.',
      image: 'assets/thumbs/negotiation-skills.webp',
      pdfUrl: 'assets/modules/negotiation-skills.pdf',
    },
    {
      id: 'networking-skills',
      title: 'Networking Skills',
      description: 'Initiating professional connections, building trust, maintaining relationships, and leveraging networks for opportunities.',
      image: 'assets/thumbs/networking-skills.webp',
      pdfUrl: 'assets/modules/networking-skills.pdf',
    },
    {
      id: 'risk-management',
      title: 'Risk Management',
      description: 'Identifying, assessing, and mitigating risks in the workplace, including safety hazards and operational risks.',
      image: 'assets/thumbs/risk-management.webp',
      pdfUrl: 'assets/modules/risk-management.pdf',
    },
    {
      id: 'problem-solving',
      title: 'Problem Solving',
      description: 'Defining problems accurately before acting — avoiding jumping to solutions, exploring alternative causes, and identifying root issues.',
      image: 'assets/thumbs/problem-solving.webp',
      pdfUrl: 'assets/modules/problem-solving.pdf',
    },
    {
      id: 'project-management',
      title: 'Project Management',
      description: 'Setting clear objectives, balancing stakeholder needs, protecting project scope, and communicating realistic priorities to deliver on time.',
      image: 'assets/thumbs/project-management.webp',
      pdfUrl: 'assets/modules/project-management.pdf',
    },
  ];

  private translate = inject(TranslateService);

  constructor() {
    this.modules.forEach(m => {
      if (this.flipbookSkillIds.has(m.id)) m.hasFlipbook = true;
    });
  }

  /** Resolve a module's PDF URL based on the active language. We have a
   *  Polish translation set under `assets/modules/pl/`; future languages
   *  can be added to TRANSLATED_PDF_LANGS without changing the templates. */
  pdfUrlFor(mod: SkillModule): string {
    const lang = this.translate.getLang?.() || 'en';
    if (TRANSLATED_PDF_LANGS.has(lang)) {
      return `assets/modules/${lang}/${mod.id}.pdf`;
    }
    return mod.pdfUrl;
  }
}

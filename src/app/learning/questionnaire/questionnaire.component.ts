import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { LearningFlowService } from '../learning-flow.service';
import { TranslateService } from '../../translate/translate.service';
import { QuestionnaireResponseService } from './questionnaire-response.service';
import {
  QUESTIONNAIRE_KEYS,
  REQUIRED_KEYS,
  QuestionnaireResponse,
  GenderValue,
  AgeGroupValue,
} from './questionnaire.interfaces';

interface LikertQuestion {
  key: keyof typeof QUESTIONNAIRE_KEYS;
  textKey: string;  // i18n key
}

interface FormSection {
  titleKey: string;  // i18n key for section header
  questions: LikertQuestion[];
}

@Component({
    selector: 'app-questionnaire',
    templateUrl: './questionnaire.component.html',
    styleUrls: ['./questionnaire.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class QuestionnaireComponent implements OnInit {

  /** Working answer buffer. Keys match QUESTIONNAIRE_KEYS; values are strings. */
  answers: { [key: string]: string } = {};

  submitted = false;

  /** True after submit + the structured Strapi POST resolved with recorded:false. */
  remoteSubmitDeferred = false;

  /** Likert sections (demographics handled separately). */
  readonly sections: FormSection[] = [
    {
      titleKey: 'LEARNING_PAGE.QUESTIONNAIRE.SECTION_DIGITAL',
      questions: [
        { key: 'digitalEasyToFollow', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_DIGITAL_EASY' },
        { key: 'digitalToolsHelpful', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_DIGITAL_TOOLS' },
        { key: 'digitalConfidenceAfterMooc', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_DIGITAL_CONFIDENCE_AFTER' },
      ],
    },
    {
      titleKey: 'LEARNING_PAGE.QUESTIONNAIRE.SECTION_ENGAGEMENT',
      questions: [
        { key: 'engagementActivities', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_ENGAGEMENT_ACTIVITIES' },
        { key: 'engagementEscapeRoom', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_ENGAGEMENT_ESCAPE_ROOM' },
      ],
    },
    {
      titleKey: 'LEARNING_PAGE.QUESTIONNAIRE.SECTION_INTERCULTURAL',
      questions: [
        { key: 'interculturalUnderstanding', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_INTERCULTURAL_UNDERSTANDING' },
        { key: 'interculturalConfidence', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_INTERCULTURAL' },
      ],
    },
    {
      titleKey: 'LEARNING_PAGE.QUESTIONNAIRE.SECTION_USABILITY',
      questions: [
        { key: 'platformEaseOfUse', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_USABILITY_EASE' },
        { key: 'platformClarityOrganization', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_USABILITY_CLARITY' },
        { key: 'platformNoTechnicalIssues', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_USABILITY_NOISSUES' },
      ],
    },
    {
      titleKey: 'LEARNING_PAGE.QUESTIONNAIRE.SECTION_IMPACT',
      questions: [
        { key: 'impactRelevant', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_IMPACT_RELEVANT' },
        { key: 'impactUsefulSkills', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_IMPACT_USEFUL' },
        { key: 'impactCareerConfidence', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_IMPACT_CAREER' },
      ],
    },
    {
      titleKey: 'LEARNING_PAGE.QUESTIONNAIRE.SECTION_OVERALL',
      questions: [
        { key: 'overallSatisfaction', textKey: 'LEARNING_PAGE.QUESTIONNAIRE.Q_OVERALL_SATISFACTION' },
      ],
    },
  ];

  readonly likertScale = [1, 2, 3, 4, 5];

  readonly genderOptions: { value: GenderValue; labelKey: string }[] = [
    { value: 'female', labelKey: 'LEARNING_PAGE.QUESTIONNAIRE.GENDER_FEMALE' },
    { value: 'male', labelKey: 'LEARNING_PAGE.QUESTIONNAIRE.GENDER_MALE' },
    { value: 'non_binary', labelKey: 'LEARNING_PAGE.QUESTIONNAIRE.GENDER_NONBINARY' },
    { value: 'prefer_not_to_say', labelKey: 'LEARNING_PAGE.QUESTIONNAIRE.GENDER_PNS' },
  ];

  readonly ageOptions: { value: AgeGroupValue; labelKey: string }[] = [
    { value: 'under_30', labelKey: 'LEARNING_PAGE.QUESTIONNAIRE.AGE_UNDER_30' },
    { value: 'age_30_50', labelKey: 'LEARNING_PAGE.QUESTIONNAIRE.AGE_30_50' },
    { value: 'over_50', labelKey: 'LEARNING_PAGE.QUESTIONNAIRE.AGE_OVER_50' },
  ];

  constructor(
    private learningService: LearningFlowService,
    private responseService: QuestionnaireResponseService,
    private translate: TranslateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const state = this.learningService.getState();
    if (state.questionnaireAnswers) {
      // Only carry over keys we recognise — drop legacy q1..q7 placeholders.
      const known = new Set<string>(Object.values(QUESTIONNAIRE_KEYS));
      this.answers = Object.fromEntries(
        Object.entries(state.questionnaireAnswers).filter(([k]) => known.has(k)),
      );
    }
    if (state.questionnaireCompleted) {
      this.submitted = true;
    }
  }

  // --- Validation ---------------------------------------------------------

  isAnswered(key: keyof typeof QUESTIONNAIRE_KEYS): boolean {
    const v = this.answers[QUESTIONNAIRE_KEYS[key]];
    return v != null && v !== '';
  }

  get allRequiredAnswered(): boolean {
    return REQUIRED_KEYS.every(k => this.isAnswered(k));
  }

  trackByLikert = (_: number, value: number) => value;
  trackByQuestion = (_: number, q: LikertQuestion) => q.key;
  trackBySection = (_: number, s: FormSection) => s.titleKey;

  // --- Likert helpers -----------------------------------------------------

  setLikert(key: keyof typeof QUESTIONNAIRE_KEYS, value: number): void {
    this.answers[QUESTIONNAIRE_KEYS[key]] = String(value);
  }

  isLikertSelected(key: keyof typeof QUESTIONNAIRE_KEYS, value: number): boolean {
    return this.answers[QUESTIONNAIRE_KEYS[key]] === String(value);
  }

  // --- Submit -------------------------------------------------------------

  submit(): void {
    if (!this.allRequiredAnswered) return;

    // 1) Persist locally + sync to learning-progresses blob (existing behavior).
    this.learningService.saveQuestionnaireAnswers(this.answers);

    // 2) POST a structured row to the dedicated questionnaire-response collection.
    const payload = this.buildResponse();
    this.responseService.submit(payload).subscribe(result => {
      this.remoteSubmitDeferred = !result.recorded;
    });

    this.submitted = true;
  }

  private buildResponse(): QuestionnaireResponse {
    const num = (k: keyof typeof QUESTIONNAIRE_KEYS): number =>
      Number(this.answers[QUESTIONNAIRE_KEYS[k]]) || 0;

    return {
      gender: this.answers[QUESTIONNAIRE_KEYS.gender] as GenderValue,
      ageGroup: this.answers[QUESTIONNAIRE_KEYS.ageGroup] as AgeGroupValue,
      digitalEasyToFollow: num('digitalEasyToFollow'),
      digitalToolsHelpful: num('digitalToolsHelpful'),
      digitalConfidenceAfterMooc: num('digitalConfidenceAfterMooc'),
      engagementActivities: num('engagementActivities'),
      engagementEscapeRoom: num('engagementEscapeRoom'),
      interculturalUnderstanding: num('interculturalUnderstanding'),
      interculturalConfidence: num('interculturalConfidence'),
      platformEaseOfUse: num('platformEaseOfUse'),
      platformClarityOrganization: num('platformClarityOrganization'),
      platformNoTechnicalIssues: num('platformNoTechnicalIssues'),
      impactRelevant: num('impactRelevant'),
      impactUsefulSkills: num('impactUsefulSkills'),
      impactCareerConfidence: num('impactCareerConfidence'),
      overallSatisfaction: num('overallSatisfaction'),
      language: this.translate.lang || 'en',
      selectedSkills: this.learningService.getSelectedSkills(),
      submittedAt: new Date().toISOString(),
    };
  }

  goToFlow(): void {
    this.router.navigate(['/learning/flow']);
  }

  /** Storage-key accessor for ngModel binding. */
  k(key: keyof typeof QUESTIONNAIRE_KEYS): string {
    return QUESTIONNAIRE_KEYS[key];
  }
}

/** Structured response posted to Strapi (one row per submission). */
export interface QuestionnaireResponse {
  // Section 1 — Demographics
  gender: GenderValue;
  ageGroup: AgeGroupValue;

  // Section 2 — Digital learning experience (Likert 1–5)
  digitalEasyToFollow: number;
  digitalToolsHelpful: number;
  digitalConfidenceAfterMooc: number;

  // Section 3 — Engagement & learning approach
  engagementActivities: number;
  engagementEscapeRoom: number;

  // Section 4 — Interculturality and inclusion
  interculturalUnderstanding: number;
  interculturalConfidence: number;

  // Section 5 — Platform usability
  platformEaseOfUse: number;
  platformClarityOrganization: number;
  platformNoTechnicalIssues: number;

  // Section 6 — Impact & usefulness
  impactRelevant: number;
  impactUsefulSkills: number;
  impactCareerConfidence: number;

  // Section 7 — Overall evaluation
  overallSatisfaction: number;

  // Context (set by the service)
  language?: string;
  selectedSkills?: string[];
  submittedAt?: string;
}

export type GenderValue = 'female' | 'male' | 'non_binary' | 'prefer_not_to_say';
export type AgeGroupValue = 'under_30' | 'age_30_50' | 'over_50';

/**
 * Storage shape used in localStorage / learning-progresses blob.
 * Kept as { [key: string]: string } to remain compatible with the existing
 * LearningFlowState.questionnaireAnswers index signature.
 */
export const QUESTIONNAIRE_KEYS = {
  gender: 'gender',
  ageGroup: 'ageGroup',
  digitalEasyToFollow: 'digitalEasyToFollow',
  digitalToolsHelpful: 'digitalToolsHelpful',
  digitalConfidenceAfterMooc: 'digitalConfidenceAfterMooc',
  engagementActivities: 'engagementActivities',
  engagementEscapeRoom: 'engagementEscapeRoom',
  interculturalUnderstanding: 'interculturalUnderstanding',
  interculturalConfidence: 'interculturalConfidence',
  platformEaseOfUse: 'platformEaseOfUse',
  platformClarityOrganization: 'platformClarityOrganization',
  platformNoTechnicalIssues: 'platformNoTechnicalIssues',
  impactRelevant: 'impactRelevant',
  impactUsefulSkills: 'impactUsefulSkills',
  impactCareerConfidence: 'impactCareerConfidence',
  overallSatisfaction: 'overallSatisfaction',
} as const;

/** All required keys — every Likert + demographics. */
export const REQUIRED_KEYS: ReadonlyArray<keyof typeof QUESTIONNAIRE_KEYS> = [
  'gender',
  'ageGroup',
  'digitalEasyToFollow',
  'digitalToolsHelpful',
  'digitalConfidenceAfterMooc',
  'engagementActivities',
  'engagementEscapeRoom',
  'interculturalUnderstanding',
  'interculturalConfidence',
  'platformEaseOfUse',
  'platformClarityOrganization',
  'platformNoTechnicalIssues',
  'impactRelevant',
  'impactUsefulSkills',
  'impactCareerConfidence',
  'overallSatisfaction',
];

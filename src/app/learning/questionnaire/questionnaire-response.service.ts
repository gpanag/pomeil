import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import {
  QuestionnaireResponse,
  GenderValue,
  AgeGroupValue,
} from './questionnaire.interfaces';

/**
 * Posts a structured questionnaire submission to the dedicated Strapi
 * collection (`questionnaire-response`). Append-only — one row per submit,
 * intended for partner reporting.
 *
 * Failure-tolerant: if the collection does not yet exist on the server,
 * or the user is not authorised, the call resolves with `recorded: false`
 * rather than throwing. Local persistence (LearningFlowService) is the
 * authoritative store for the user's own progress.
 *
 * Server schema is documented in `fixes_additions/STRAPI_QUESTIONNAIRE_SCHEMA.md`.
 */
@Injectable({ providedIn: 'root' })
export class QuestionnaireResponseService {
  constructor(private http: HttpClient) {}

  submit(response: QuestionnaireResponse): Observable<{ recorded: boolean }> {
    const body = { data: this.toStrapiPayload(response) };

    return this.http.post('/api/questionnaire-responses', body).pipe(
      map(() => ({ recorded: true })),
      catchError(err => {
        // Expected while the Strapi collection is being provisioned.
        // Don't bubble — the questionnaire UI succeeds based on local persistence.
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(
            '[QuestionnaireResponseService] could not POST to /api/questionnaire-responses',
            { status: err?.status, message: err?.message },
          );
        }
        return of({ recorded: false });
      }),
    );
  }

  /** Build the Strapi `data:` body. Kept separate so the schema is easy to audit. */
  private toStrapiPayload(r: QuestionnaireResponse): Record<string, any> {
    return {
      gender: r.gender as GenderValue,
      ageGroup: r.ageGroup as AgeGroupValue,
      digitalEasyToFollow: r.digitalEasyToFollow,
      digitalToolsHelpful: r.digitalToolsHelpful,
      digitalConfidenceAfterMooc: r.digitalConfidenceAfterMooc,
      engagementActivities: r.engagementActivities,
      engagementEscapeRoom: r.engagementEscapeRoom,
      interculturalUnderstanding: r.interculturalUnderstanding,
      interculturalConfidence: r.interculturalConfidence,
      platformEaseOfUse: r.platformEaseOfUse,
      platformClarityOrganization: r.platformClarityOrganization,
      platformNoTechnicalIssues: r.platformNoTechnicalIssues,
      impactRelevant: r.impactRelevant,
      impactUsefulSkills: r.impactUsefulSkills,
      impactCareerConfidence: r.impactCareerConfidence,
      overallSatisfaction: r.overallSatisfaction,
      language: r.language ?? null,
      selectedSkills: r.selectedSkills ?? [],
      submittedAt: r.submittedAt ?? new Date().toISOString(),
    };
  }
}

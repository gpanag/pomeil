import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, debounceTime, switchMap, of, catchError } from 'rxjs';
import { LearningFlowState, RoomScore } from '../shared/escape-room/escape-room-scoring.interfaces';
import { AuthService } from '../auth/auth.service';

const STORAGE_KEY = 'pomeil_learning_flow';

const INITIAL_STATE: LearningFlowState = {
  selectedSkills: [],
  roomScores: {},
  currentSkillIndex: 0,
  questionnaireCompleted: false,
  questionnaireAnswers: {},
};

@Injectable({ providedIn: 'root' })
export class LearningFlowService {

  private state: LearningFlowState;
  readonly state$ = new BehaviorSubject<LearningFlowState>(INITIAL_STATE);

  private strapiDocumentId: string | null = null;
  private syncSubject = new Subject<LearningFlowState>();

  constructor(private http: HttpClient, private auth: AuthService) {
    this.state = this.loadFromStorage();
    this.state$.next(this.state);

    // Debounced sync to Strapi
    this.syncSubject.pipe(
      debounceTime(1500),
      switchMap(state => this.saveToStrapi(state))
    ).subscribe();

    // On login: load from Strapi
    this.auth.user$.subscribe(user => {
      if (user) {
        this.loadFromStrapi();
      } else {
        this.strapiDocumentId = null;
      }
    });
  }

  // --- State accessors ---

  getState(): LearningFlowState {
    return this.state;
  }

  getSelectedSkills(): string[] {
    return this.state.selectedSkills;
  }

  getRoomScore(roomId: string): RoomScore | undefined {
    return this.state.roomScores[roomId];
  }

  getAllRoomScores(): { [roomId: string]: RoomScore } {
    return this.state.roomScores;
  }

  getCurrentSkillIndex(): number {
    return this.state.currentSkillIndex;
  }

  isQuestionnaireCompleted(): boolean {
    return this.state.questionnaireCompleted;
  }

  // --- State mutators ---

  setSelectedSkills(skills: string[]): void {
    this.state.selectedSkills = skills;
    this.state.currentSkillIndex = 0;
    this.state.roomScores = {};
    this.state.questionnaireCompleted = false;
    this.state.questionnaireAnswers = {};
    this.persist();
  }

  saveRoomScore(score: RoomScore): void {
    this.state.roomScores[score.roomId] = score;
    this.persist();
  }

  advanceToNextSkill(): void {
    if (this.state.currentSkillIndex < this.state.selectedSkills.length - 1) {
      this.state.currentSkillIndex++;
      this.persist();
    }
  }

  setCurrentSkillIndex(index: number): void {
    this.state.currentSkillIndex = index;
    this.persist();
  }

  saveQuestionnaireAnswers(answers: { [questionId: string]: string }): void {
    this.state.questionnaireAnswers = answers;
    this.state.questionnaireCompleted = true;
    this.persist();
  }

  resetFlow(): void {
    this.state = { ...INITIAL_STATE, selectedSkills: [], roomScores: {}, questionnaireAnswers: {} };
    this.persist();
  }

  // --- Persistence ---

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch { /* localStorage full or disabled */ }
    this.state$.next({ ...this.state });

    // Sync to Strapi if logged in
    if (this.auth.isLoggedIn()) {
      this.syncSubject.next({ ...this.state });
    }
  }

  private loadFromStorage(): LearningFlowState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...INITIAL_STATE, ...parsed };
      }
    } catch { /* corrupt data */ }
    return { ...INITIAL_STATE, selectedSkills: [], roomScores: {}, questionnaireAnswers: {} };
  }

  // --- Strapi sync ---

  private loadFromStrapi(): void {
    this.http.get<any>('/api/learning-progresses').pipe(
      catchError(() => of({ data: [] }))
    ).subscribe(res => {
      const records = res.data || [];
      if (records.length > 0) {
        const record = records[0];
        this.strapiDocumentId = record.documentId;
        if (record.state) {
          // Server state takes precedence
          this.state = { ...INITIAL_STATE, ...record.state };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
          } catch {}
          this.state$.next({ ...this.state });
        }
      }
    });
  }

  private saveToStrapi(state: LearningFlowState) {
    const body = { data: { state } };

    if (this.strapiDocumentId) {
      return this.http.put(`/api/learning-progresses/${this.strapiDocumentId}`, body).pipe(
        catchError(() => of(null))
      );
    } else {
      return this.http.post<any>('/api/learning-progresses', body).pipe(
        catchError(() => of(null))
      ).pipe(
        switchMap(res => {
          if (res?.data?.documentId) {
            this.strapiDocumentId = res.data.documentId;
          }
          return of(res);
        })
      );
    }
  }
}

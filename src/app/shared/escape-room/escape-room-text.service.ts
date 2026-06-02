import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, shareReplay } from 'rxjs';
import { TranslateService } from '../../translate/translate.service';

export interface EscapeRoomTexts {
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class EscapeRoomTextService {
  private cache = new Map<string, Observable<EscapeRoomTexts>>();

  constructor(private http: HttpClient, private translateService: TranslateService) {}

  loadTexts(roomId: string): Observable<EscapeRoomTexts> {
    const lang = this.translateService.getLang() || 'en';
    const cacheKey = `${roomId}:${lang}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const url = `/assets/i18n/escape-rooms/${roomId}/${lang}.json`;
    const fallbackUrl = `/assets/i18n/escape-rooms/${roomId}/en.json`;

    const obs$ = this.http.get<EscapeRoomTexts>(url).pipe(
      catchError(() => {
        if (lang !== 'en') {
          return this.http.get<EscapeRoomTexts>(fallbackUrl).pipe(
            catchError(() => of({}))
          );
        }
        return of({});
      }),
      shareReplay(1)
    );

    this.cache.set(cacheKey, obs$);
    return obs$;
  }

  getText(texts: EscapeRoomTexts, dotPath: string): string {
    const parts = dotPath.split('.');
    let current: any = texts;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return dotPath;
      current = current[part];
    }
    // A numeric leaf is a valid translatable value (e.g. a review's star rating).
    // Return its string form rather than the dot-path, so callers doing `+t(key)`
    // get the number instead of NaN (which used to crash `Array(NaN)` star loops).
    if (typeof current === 'number') return String(current);
    if (typeof current !== 'string') return dotPath;

    // Replace (username) / <username> / X (username) with stored player name.
    // Fall back to "you" when no name is set, so the placeholder never renders literally.
    const playerName = this.getPlayerName() || 'you';
    current = current
      .replace(/X \(username\)/g, playerName)
      .replace(/\(username\)/gi, playerName)
      .replace(/<username>/gi, playerName);
    return current;
  }

  /** Get player name from localStorage or logged-in user, fallback to empty string */
  getPlayerName(): string {
    try {
      // First check explicit player name
      const explicit = localStorage.getItem('pomeil_player_name');
      if (explicit) return explicit;
      // Fall back to logged-in user's username
      const userRaw = localStorage.getItem('pomeil_user');
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (user.username) return user.username;
      }
      return '';
    } catch {
      return '';
    }
  }

  /** Set player name in localStorage */
  setPlayerName(name: string): void {
    try {
      localStorage.setItem('pomeil_player_name', name);
    } catch { /* ignore */ }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

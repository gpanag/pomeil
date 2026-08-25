import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { StrapiUser, StrapiAuthResponse } from './auth.interfaces';

const JWT_KEY = 'pomeil_jwt';
const USER_KEY = 'pomeil_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<StrapiUser | null>(this.loadUser());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  private loadUser(): StrapiUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  getToken(): string | null {
    return localStorage.getItem(JWT_KEY);
  }

  getUser(): StrapiUser | null {
    return this.userSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  login(identifier: string, password: string): Observable<StrapiAuthResponse> {
    return this.http.post<StrapiAuthResponse>('/api/auth/local', { identifier, password }).pipe(
      tap(res => {
        localStorage.setItem(JWT_KEY, res.jwt);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.userSubject.next(res.user);
      }),
      catchError(err => {
        const message = err.error?.error?.message || 'Login failed';
        return throwError(() => new Error(message));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSubject.next(null);
  }

  /**
   * Register a new account. With Strapi email confirmation enabled the
   * response contains a `user` but no `jwt` — the user must click the link
   * sent to their email before they can log in.
   */
  register(email: string, password: string, username?: string): Observable<{ user: StrapiUser; jwt?: string }> {
    const body = {
      email,
      password,
      username: (username && username.trim()) || email.split('@')[0],
    };
    return this.http.post<{ user: StrapiUser; jwt?: string }>('/api/auth/local/register', body).pipe(
      tap(res => {
        if (res.jwt) {
          localStorage.setItem(JWT_KEY, res.jwt);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.userSubject.next(res.user);
        }
      }),
      catchError(err => {
        const message = err.error?.error?.message || 'Registration failed';
        return throwError(() => new Error(message));
      })
    );
  }

  forgotPassword(email: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>('/api/auth/forgot-password', { email }).pipe(
      catchError(err => {
        const message = err.error?.error?.message || 'Could not send reset email';
        return throwError(() => new Error(message));
      })
    );
  }

  resetPassword(code: string, password: string, passwordConfirmation: string): Observable<StrapiAuthResponse> {
    return this.http.post<StrapiAuthResponse>('/api/auth/reset-password', {
      code, password, passwordConfirmation,
    }).pipe(
      tap(res => {
        localStorage.setItem(JWT_KEY, res.jwt);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.userSubject.next(res.user);
      }),
      catchError(err => {
        const message = err.error?.error?.message || 'Password reset failed';
        return throwError(() => new Error(message));
      })
    );
  }

  changePassword(currentPassword: string, password: string, passwordConfirmation: string): Observable<any> {
    return this.http.post('/api/auth/change-password', {
      currentPassword, password, passwordConfirmation
    }).pipe(
      catchError(err => {
        const message = err.error?.error?.message || 'Password change failed';
        return throwError(() => new Error(message));
      })
    );
  }

  updateProfile(data: { username?: string }): Observable<StrapiUser> {
    const user = this.getUser();
    if (!user) return throwError(() => new Error('Not logged in'));
    return this.http.put<StrapiUser>(`/api/users/${user.id}`, data).pipe(
      tap(updated => {
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        this.userSubject.next(updated);
      }),
      catchError(err => {
        const message = err.error?.error?.message || 'Profile update failed';
        return throwError(() => new Error(message));
      })
    );
  }

  fetchCurrentUser(): Observable<StrapiUser> {
    return this.http.get<StrapiUser>('/api/users/me').pipe(
      tap(user => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.userSubject.next(user);
      })
    );
  }
}

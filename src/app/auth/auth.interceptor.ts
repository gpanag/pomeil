import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Strapi rejects ANY request that carries an invalid Bearer token with
 * 401 — even on endpoints whose Public role would otherwise allow the
 * call. So a stale token in localStorage (e.g. left over from a prior
 * login that has since expired) breaks the entire site, including
 * read-only content like /api/about and /api/news.
 *
 * The fix: only attach the token to endpoints that actually require
 * authentication. Everything else goes anonymous, which Strapi accepts.
 *
 * AUTHENTICATED_PREFIXES is an allowlist — new public collections do
 * not need to be added here. New protected endpoints do.
 */
const AUTHENTICATED_PREFIXES = [
  '/api/users/',                  // /api/users/me, /api/users/:id
  '/api/auth/change-password',
  '/api/learning-progresses',     // controller is user-scoped; rejects without auth
  '/api/questionnaire-responses', // lifecycle hook auto-links user when JWT present
];

const requiresAuth = (url: string): boolean =>
  AUTHENTICATED_PREFIXES.some(p => url.startsWith(p));

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('pomeil_jwt');
  const shouldAttach = !!token && requiresAuth(req.url);

  const handled = shouldAttach
    ? next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))
    : next(req);

  return handled.pipe(
    catchError((err: HttpErrorResponse) => {
      // A 401 on an /api/ call means our token is no longer valid (or
      // never was). Clear it so subsequent requests go anonymous and
      // the user gets a chance to log in again on auth-gated screens.
      if (err.status === 401 && token && req.url.startsWith('/api/')) {
        localStorage.removeItem('pomeil_jwt');
        localStorage.removeItem('pomeil_user');
      }
      return throwError(() => err);
    })
  );
};

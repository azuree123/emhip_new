import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/** True for requests to this app's own API (relative URLs, or absolute ones under apiBaseUrl). */
function isOwnApi(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return true;
  const base = environment.apiBaseUrl;
  if (/^https?:\/\//i.test(base)) return url.startsWith(base);
  // Relative apiBaseUrl (production): only same-origin absolute URLs count.
  return typeof window !== 'undefined' && url.startsWith(window.location.origin);
}

/**
 * Attaches the bearer token issued at login — but only to our own API, so a third-party URL can
 * never receive a clinical-system credential. A 401 means the token is missing/expired, so sign
 * out and bounce to /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  const authedReq = token && isOwnApi(req.url) ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && auth.isAuthenticated()) {
        auth.logout();
        router.navigate(['/login'], { queryParams: { reason: 'expired' } });
      }
      return throwError(() => error);
    }),
  );
};

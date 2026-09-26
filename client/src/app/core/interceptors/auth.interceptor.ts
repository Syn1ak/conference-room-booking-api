import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SessionStore } from '../services/session/session.store';

/** Endpoints that are anonymous by nature: a 401 from login means wrong credentials, not an expired session. */
const ANONYMOUS_ENDPOINTS = ['/api/auth/login', '/api/auth/register'];

/** Only our own API gets the token, never another origin. */
function needsToken(url: string): boolean {
  return url.startsWith('/api/') && !ANONYMOUS_ENDPOINTS.includes(url);
}

/**
 * Sends the session's access token with API requests, and ends the session when the API rejects the token, for
 * example after it expired or the server's signing key changed.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionStore);
  const token = session.accessToken;

  if (!needsToken(request.url) || !token || request.headers.has('Authorization')) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        session.expire();
      }

      return throwError(() => error);
    }),
  );
};

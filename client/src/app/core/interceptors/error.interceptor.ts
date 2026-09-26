import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast/toast.service';
import { toApiError } from '../utils/api-error.util';

/** Set on a request whose caller shows its own message for network failures, server errors, and 429. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/**
 * Tells the user about failures no page can do anything about: the server being unreachable, a server error, or too
 * many requests. Every error is still passed on, and 400, 404, and 409 are left entirely to the page, which knows
 * what they mean.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const toasts = inject(ToastService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !request.context.get(SKIP_ERROR_TOAST)) {
        const apiError = toApiError(error);

        if (apiError.status === 0) {
          toasts.error("Can't reach the server", 'Check your connection and try again.');
        } else if (apiError.status === 429) {
          toasts.error(
            'Too many requests',
            apiError.retryAfterSeconds
              ? `Wait ${apiError.retryAfterSeconds} seconds and try again.`
              : 'Wait a moment and try again.',
          );
        } else if (apiError.status >= 500) {
          toasts.error('Something went wrong on our side', 'Please try again in a moment.');
        }
      }

      return throwError(() => error);
    }),
  );
};

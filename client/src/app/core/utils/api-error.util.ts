import { HttpErrorResponse } from '@angular/common/http';
import { FieldTree, ValidationError } from '@angular/forms/signals';

/** An error response from the API, whatever shape it arrived in. */
export type TApiError = {
  /** The HTTP status, or 0 when the server couldn't be reached. */
  status: number;
  title: string;
  detail: string | null;
  /** Messages per field, with camelCase keys (`email`, `attendeeCount`). An empty key is about the whole request. */
  fieldErrors: Record<string, string[]>;
  /** Seconds to wait before trying again, from the Retry-After header of a 429. */
  retryAfterSeconds: number | null;
};

type TProblemDetails = {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

const FALLBACK_TITLES: Record<number, string> = {
  0: "Can't reach the server.",
  400: 'The request is invalid.',
  401: 'You need to sign in.',
  403: "You don't have access to this.",
  404: "This doesn't exist.",
  409: 'This conflicts with the current state.',
  429: 'Too many requests.',
};

/**
 * Turns an API field name into the form field it belongs to: `Email` → `email`, `$.attendeeCount` → `attendeeCount`.
 * Model validation names body fields as JSON paths, and application errors use C# property names.
 */
export function normalizeFieldKey(key: string): string {
  const withoutPath = key.replace(/^\$\.?/, '');

  return withoutPath.charAt(0).toLowerCase() + withoutPath.slice(1);
}

function isProblemDetails(body: unknown): body is TProblemDetails {
  return typeof body === 'object' && body !== null && ('title' in body || 'errors' in body);
}

/** Reads any error thrown by `HttpClient` into a `TApiError`. */
export function toApiError(error: unknown): TApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      status: 0,
      title: 'Something went wrong.',
      detail: null,
      fieldErrors: {},
      retryAfterSeconds: null,
    };
  }

  const status = error.status;
  const problem = isProblemDetails(error.error) ? error.error : null;
  const fieldErrors: Record<string, string[]> = {};

  for (const [key, messages] of Object.entries(problem?.errors ?? {})) {
    const field = normalizeFieldKey(key);
    fieldErrors[field] = [...(fieldErrors[field] ?? []), ...messages];
  }

  const retryAfter = Number(error.headers?.get('Retry-After'));

  return {
    status,
    title:
      problem?.title ??
      FALLBACK_TITLES[status] ??
      (status >= 500 ? 'Something went wrong on our side.' : 'The request failed.'),
    detail: problem?.detail ?? null,
    fieldErrors,
    retryAfterSeconds:
      status === 429 && Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
  };
}

/**
 * Turns an API error into Signal Forms submission errors: each field error lands on the matching form field (keys are
 * compared ignoring case), and everything else lands on the form itself.
 */
export function toFormErrors(
  apiError: TApiError,
  fields: Record<string, FieldTree<unknown>>,
): ValidationError.WithOptionalFieldTree[] {
  const fieldsByKey = new Map(
    Object.entries(fields).map(([key, field]) => [key.toLowerCase(), field]),
  );
  const errors: ValidationError.WithOptionalFieldTree[] = [];

  for (const [key, messages] of Object.entries(apiError.fieldErrors)) {
    const fieldTree = fieldsByKey.get(key.toLowerCase());
    for (const message of messages) {
      errors.push(fieldTree ? { kind: 'server', message, fieldTree } : { kind: 'server', message });
    }
  }

  if (errors.length === 0) {
    errors.push({ kind: 'server', message: apiError.detail ?? apiError.title });
  }

  return errors;
}

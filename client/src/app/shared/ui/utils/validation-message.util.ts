import { ValidationError } from '@angular/forms/signals';

const FALLBACK_MESSAGES: Record<string, string> = {
  required: 'This field is required.',
  email: 'Enter a valid email address.',
  min: 'The value is too small.',
  max: 'The value is too large.',
  minLength: 'The value is too short.',
  maxLength: 'The value is too long.',
  pattern: 'The value has the wrong format.',
};

/** The text to show for a validation error: its own message, or a generic one for its kind. */
export function validationMessage(error: ValidationError): string {
  return error.message ?? FALLBACK_MESSAGES[error.kind] ?? 'The value is invalid.';
}

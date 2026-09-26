import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { normalizeFieldKey, toApiError, toFormErrors } from './api-error.util';

const response = (status: number, error: unknown, headers?: Record<string, string>) =>
  new HttpErrorResponse({ status, error, headers: new HttpHeaders(headers) });

describe('normalizeFieldKey', () => {
  it.each([
    ['Email', 'email'],
    ['AttendeeCount', 'attendeeCount'],
    ['$.name', 'name'],
    ['$.services[0].price', 'services[0].price'],
    ['', ''],
  ])('turns %s into %s', (key, expected) => {
    expect(normalizeFieldKey(key)).toBe(expected);
  });
});

describe('toApiError', () => {
  it('reads a validation problem with its field errors', () => {
    const error = toApiError(
      response(400, {
        title: 'One or more validation errors occurred.',
        errors: {
          Email: ['An account with this email already exists.'],
          '$.password': ['Too short.'],
        },
      }),
    );

    expect(error.status).toBe(400);
    expect(error.title).toBe('One or more validation errors occurred.');
    expect(error.fieldErrors).toEqual({
      email: ['An account with this email already exists.'],
      password: ['Too short.'],
    });
  });

  it('merges messages whose keys differ only by their form', () => {
    const error = toApiError(
      response(400, { errors: { Name: ['Required.'], '$.name': ['Too long.'] } }),
    );

    expect(error.fieldErrors).toEqual({ name: ['Required.', 'Too long.'] });
  });

  it('reads a problem without field errors', () => {
    const error = toApiError(
      response(409, { title: 'The room is already booked for some or all of this time.' }),
    );

    expect(error).toMatchObject({
      status: 409,
      title: 'The room is already booked for some or all of this time.',
      fieldErrors: {},
    });
  });

  it('reads the wait time of a 429', () => {
    const error = toApiError(
      response(
        429,
        { title: 'Too many requests.', detail: 'Try again in 42 seconds.' },
        { 'Retry-After': '42' },
      ),
    );

    expect(error.retryAfterSeconds).toBe(42);
    expect(error.detail).toBe('Try again in 42 seconds.');
  });

  it('ignores a Retry-After that is not a number of seconds', () => {
    const error = toApiError(
      response(429, null, { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }),
    );

    expect(error.retryAfterSeconds).toBeNull();
  });

  it("describes a server that couldn't be reached", () => {
    expect(toApiError(response(0, new ProgressEvent('error'))).title).toBe(
      "Can't reach the server.",
    );
  });

  it('falls back to a generic title for an HTML error page or an empty body', () => {
    expect(toApiError(response(502, '<html>Bad gateway</html>')).title).toBe(
      'Something went wrong on our side.',
    );
    expect(toApiError(response(404, null)).title).toBe("This doesn't exist.");
  });

  it('handles something that is not an HTTP error at all', () => {
    expect(toApiError(new Error('boom')).status).toBe(0);
  });
});

describe('toFormErrors', () => {
  const loginForm = () =>
    TestBed.runInInjectionContext(() => form(signal({ email: '', attendeeCount: 1 })));

  it('puts each field error on its field, matching keys ignoring case', () => {
    const f = loginForm();

    const errors = toFormErrors(
      toApiError(
        response(400, { errors: { AttendeeCount: ['The room holds at most 50 people.'] } }),
      ),
      { email: f.email, attendeeCount: f.attendeeCount },
    );

    expect(errors).toEqual([
      { kind: 'server', message: 'The room holds at most 50 people.', fieldTree: f.attendeeCount },
    ]);
  });

  it('puts errors for unknown fields and problems without fields on the form', () => {
    const f = loginForm();

    expect(
      toFormErrors(toApiError(response(400, { errors: { '': ['Invalid request.'] } })), {
        email: f.email,
      }),
    ).toEqual([{ kind: 'server', message: 'Invalid request.' }]);
    expect(
      toFormErrors(toApiError(response(401, { title: 'Invalid email or password.' })), {
        email: f.email,
      }),
    ).toEqual([{ kind: 'server', message: 'Invalid email or password.' }]);
  });

  it('prefers the detail over the title for a problem without fields', () => {
    const f = loginForm();

    expect(
      toFormErrors(
        toApiError(
          response(429, { title: 'Too many requests.', detail: 'Try again in 5 seconds.' }),
        ),
        {
          email: f.email,
        },
      ),
    ).toEqual([{ kind: 'server', message: 'Try again in 5 seconds.' }]);
  });
});

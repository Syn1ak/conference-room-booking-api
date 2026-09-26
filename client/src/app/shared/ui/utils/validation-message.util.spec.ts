import { validationMessage } from './validation-message.util';

describe('validationMessage', () => {
  it("prefers the error's own message", () => {
    expect(validationMessage({ kind: 'required', message: 'Enter a name.' })).toBe('Enter a name.');
  });

  it('falls back to a message for the kind', () => {
    expect(validationMessage({ kind: 'email' })).toBe('Enter a valid email address.');
  });

  it('falls back to a generic message for an unknown kind', () => {
    expect(validationMessage({ kind: 'mystery' })).toBe('The value is invalid.');
  });
});

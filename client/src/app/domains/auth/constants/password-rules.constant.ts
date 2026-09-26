export type TPasswordRule = { label: string; test: (password: string) => boolean };

/** The account password policy the API enforces (ASP.NET Core Identity's options), shown as a checklist. */
export const PASSWORD_RULES: TPasswordRule[] = [
  { label: 'At least 8 characters', test: (password) => password.length >= 8 },
  { label: 'An uppercase letter', test: (password) => /[A-Z]/.test(password) },
  { label: 'A lowercase letter', test: (password) => /[a-z]/.test(password) },
  { label: 'A digit', test: (password) => /\d/.test(password) },
  { label: 'A symbol, such as ! or #', test: (password) => /[^a-zA-Z0-9]/.test(password) },
];

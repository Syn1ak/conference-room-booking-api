/**
 * The page to return to after signing in, if it's a path in this app. Anything else, such as `https://evil.test` or
 * `//evil.test`, is dropped, so a crafted link can't send users to another site.
 */
export function safeReturnUrl(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null;
  }

  return value;
}

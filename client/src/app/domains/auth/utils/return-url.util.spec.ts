import { safeReturnUrl } from './return-url.util';

describe('safeReturnUrl', () => {
  it.each(['/bookings', '/bookings?page=2', '/?date=2026-10-01&from=10:00'])(
    'keeps the path %s',
    (url) => {
      expect(safeReturnUrl(url)).toBe(url);
    },
  );

  it.each([
    null,
    undefined,
    '',
    'bookings',
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    'javascript:alert(1)',
  ])('drops %s', (url) => {
    expect(safeReturnUrl(url)).toBeNull();
  });
});

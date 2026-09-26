import { formatHours, formatRate } from './format-report.util';

describe('report formatting', () => {
  it.each([
    [0, '0%'],
    [0.4231, '42.3%'],
    [1, '100%'],
  ])('shows the rate %s as %s', (rate, expected) => {
    expect(formatRate(rate)).toBe(expected);
  });

  it.each([
    [12, '12 h'],
    [7.25, '7.25 h'],
    [684420, '684,420 h'],
  ])('shows %s hours as %s', (hours, expected) => {
    expect(formatHours(hours)).toBe(expected);
  });
});

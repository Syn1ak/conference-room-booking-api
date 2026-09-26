import { DurationPipe } from './duration.pipe';

describe('DurationPipe', () => {
  const pipe = new DurationPipe();

  it.each([
    [30, '30 min'],
    [60, '1 h'],
    [90, '1 h 30 min'],
    [1020, '17 h'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(pipe.transform(minutes)).toBe(expected);
  });

  it('shows nothing for a missing or negative duration', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(-5)).toBe('');
  });
});

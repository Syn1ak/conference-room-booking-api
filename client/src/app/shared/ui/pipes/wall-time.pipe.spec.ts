import { WallDatePipe } from './wall-date.pipe';
import { WallRangePipe } from './wall-range.pipe';
import { WallTimePipe } from './wall-time.pipe';

describe('wall-clock pipes', () => {
  const time = new WallTimePipe();
  const date = new WallDatePipe();
  const range = new WallRangePipe();

  it('show the time as written, whatever the offset', () => {
    expect(time.transform('2026-10-01T10:00:00+03:00')).toBe('10:00');
    expect(time.transform('2026-12-01T10:00:00+02:00')).toBe('10:00');
    expect(time.transform('2026-10-01T07:15:00Z')).toBe('07:15');
  });

  it('show midnight as 00:00', () => {
    expect(time.transform('2026-10-01T00:00:00+03:00')).toBe('00:00');
  });

  it("don't move the date across midnight in the browser's time zone", () => {
    expect(date.transform('2026-10-01T23:00:00+03:00')).toBe('Thu, 1 Oct 2026');
    expect(date.transform('2026-10-01T00:30:00+03:00', 'short')).toBe('1 Oct');
  });

  it('format a date without a time', () => {
    expect(date.transform('2026-10-01', 'long')).toBe('1 Oct 2026');
  });

  it('format a range of times', () => {
    expect(range.transform('2026-10-01T11:00:00+03:00', '2026-10-01T15:00:00+03:00')).toBe(
      '11:00–15:00',
    );
  });

  it('return invalid input unchanged and missing input as nothing', () => {
    expect(time.transform('soon')).toBe('soon');
    expect(date.transform('soon')).toBe('soon');
    expect(time.transform(null)).toBe('');
    expect(range.transform(null, '2026-10-01T15:00:00+03:00')).toBe('');
  });
});

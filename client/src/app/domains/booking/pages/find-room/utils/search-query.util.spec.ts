import { TEST_VENUE } from '../../../../../core/testing/venue.testing';
import { timeOptions } from '../../../../../core/utils/venue-time.util';
import { isCompleteSearch, parseSearchQuery } from './search-query.util';

describe('parseSearchQuery', () => {
  const options = timeOptions(TEST_VENUE);

  it('reads a well-formed search', () => {
    expect(
      parseSearchQuery(
        { date: '2026-10-15', from: '11:00', to: '15:00', capacity: '20' },
        '2026-10-01',
        options,
      ),
    ).toEqual({ date: '2026-10-15', from: '11:00', to: '15:00', capacity: 20 });
  });

  it('falls back to tomorrow, 10:00–12:00, and one person when values are missing', () => {
    expect(parseSearchQuery({}, '2026-10-31', options)).toEqual({
      date: '2026-11-01',
      from: '10:00',
      to: '12:00',
      capacity: 1,
    });
  });

  it.each([
    [{ date: '15.10.2026' }, 'date', '2026-10-02'],
    [{ date: '2026-13-45' }, 'date', '2026-10-02'],
    [{ from: '10:10' }, 'from', '10:00'],
    [{ from: '05:00' }, 'from', '10:00'],
    [{ to: 'noon' }, 'to', '12:00'],
    [{ capacity: '0' }, 'capacity', 1],
    [{ capacity: '-3' }, 'capacity', 1],
    [{ capacity: '2.5' }, 'capacity', 1],
    [{ capacity: 'ten' }, 'capacity', 1],
  ] as const)('replaces a malformed value (%o)', (raw, field, expected) => {
    expect(parseSearchQuery(raw, '2026-10-01', options)[field]).toBe(expected);
  });

  it('keeps a well-formed date in the past, so the form can say what is wrong with it', () => {
    expect(parseSearchQuery({ date: '2020-01-01' }, '2026-10-01', options).date).toBe('2020-01-01');
  });
});

describe('isCompleteSearch', () => {
  it('needs every part of the search', () => {
    expect(
      isCompleteSearch({ date: '2026-10-15', from: '11:00', to: '15:00', capacity: '2' }),
    ).toBe(true);
    expect(isCompleteSearch({ date: '2026-10-15', from: '11:00', to: '15:00' })).toBe(false);
    expect(isCompleteSearch({})).toBe(false);
  });
});

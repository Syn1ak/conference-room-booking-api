import { TEST_VENUE } from '../testing/venue.testing';
import { addDays, slotProblems, timeOptions, toVenueIso, venueToday } from './venue-time.util';

const KYIV = 'Europe/Kyiv';

describe('toVenueIso', () => {
  it('uses summer time (+03:00) in summer and winter time (+02:00) in winter', () => {
    expect(toVenueIso('2026-07-01', '10:00', KYIV)).toBe('2026-07-01T10:00:00+03:00');
    expect(toVenueIso('2026-12-01', '10:00', KYIV)).toBe('2026-12-01T10:00:00+02:00');
  });

  it('switches to summer time on the last Sunday of March', () => {
    expect(toVenueIso('2026-03-28', '10:00', KYIV)).toBe('2026-03-28T10:00:00+02:00');
    expect(toVenueIso('2026-03-29', '06:00', KYIV)).toBe('2026-03-29T06:00:00+03:00');
  });

  it('switches back to winter time on the last Sunday of October', () => {
    expect(toVenueIso('2026-10-24', '22:45', KYIV)).toBe('2026-10-24T22:45:00+03:00');
    expect(toVenueIso('2026-10-25', '06:00', KYIV)).toBe('2026-10-25T06:00:00+02:00');
  });

  it('writes negative offsets for zones behind UTC', () => {
    expect(toVenueIso('2026-07-01', '10:00', 'America/New_York')).toBe('2026-07-01T10:00:00-04:00');
  });
});

describe('venueToday', () => {
  it("gives the venue's date, which can differ from UTC's", () => {
    const lateEveningUtc = new Date('2026-09-30T22:30:00Z');

    expect(venueToday(lateEveningUtc, KYIV)).toBe('2026-10-01');
  });
});

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('timeOptions', () => {
  it('runs from opening to closing in 15-minute steps', () => {
    const options = timeOptions(TEST_VENUE);

    expect(options[0]).toBe('06:00');
    expect(options[1]).toBe('06:15');
    expect(options.at(-1)).toBe('23:00');
    expect(options).toHaveLength(17 * 4 + 1);
  });
});

describe('slotProblems', () => {
  // 1 October 2026, 09:00 in Kyiv.
  const now = new Date('2026-10-01T06:00:00Z');
  const fields = (date: string, from: string, to: string) =>
    slotProblems({ date, from, to }, now, TEST_VENUE).map((problem) => problem.field);
  const messages = (date: string, from: string, to: string) =>
    slotProblems({ date, from, to }, now, TEST_VENUE).map((problem) => problem.message);

  it('accepts a bookable slot', () => {
    expect(fields('2026-10-02', '10:00', '14:00')).toEqual([]);
  });

  it('accepts exactly the minimum length and rejects anything shorter', () => {
    expect(fields('2026-10-02', '10:00', '10:30')).toEqual([]);
    expect(messages('2026-10-02', '10:00', '10:15')).toEqual([
      'A booking lasts at least 30 minutes.',
    ]);
  });

  it('rejects an end that is not after the start', () => {
    expect(messages('2026-10-02', '14:00', '14:00')).toEqual(['The end must be after the start.']);
    expect(fields('2026-10-02', '14:00', '10:00')).toEqual(['to']);
  });

  it('rejects times outside opening hours', () => {
    expect(messages('2026-10-02', '05:45', '07:00')).toEqual(['Rooms are open 06:00–23:00.']);
    expect(fields('2026-10-02', '22:00', '23:15')).toEqual(['to']);
    expect(fields('2026-10-02', '22:30', '23:00')).toEqual([]);
  });

  it('rejects times off the 15-minute grid', () => {
    expect(fields('2026-10-02', '10:10', '11:00')).toEqual(['from']);
    expect(fields('2026-10-02', '10:00', '11:05')).toEqual(['to']);
  });

  it('rejects a past date and a start that has already passed today', () => {
    expect(fields('2026-09-30', '10:00', '11:00')).toEqual(['date']);
    expect(messages('2026-10-01', '09:00', '10:00')).toEqual(['The start must be in the future.']);
    expect(fields('2026-10-01', '09:15', '10:00')).toEqual([]);
  });

  it('accepts a start exactly one year ahead and rejects one a step later', () => {
    expect(fields('2027-10-01', '09:00', '10:00')).toEqual([]);
    expect(messages('2027-10-01', '09:15', '10:00')).toEqual([
      'Bookings can be made at most 1 year ahead.',
    ]);
  });
});

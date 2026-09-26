import { IBooking } from '../../../../../core/entities/bookings/booking.dto';
import { bookingState, parsePage } from './booking-state.util';

describe('bookingState', () => {
  const booking = (overrides: Partial<IBooking> = {}) =>
    ({
      status: 'Confirmed',
      start: '2026-10-15T11:00:00+03:00',
      end: '2026-10-15T15:00:00+03:00',
      ...overrides,
    }) as IBooking;

  it.each([
    ['2026-10-15T07:59:00Z', 'upcoming'],
    ['2026-10-15T08:00:00Z', 'in-progress'],
    ['2026-10-15T11:59:00Z', 'in-progress'],
    ['2026-10-15T12:00:00Z', 'completed'],
  ])('at %s a confirmed 11:00–15:00 booking is %s', (now, expected) => {
    expect(bookingState(booking(), new Date(now))).toBe(expected);
  });

  it('says cancelled whatever the time', () => {
    expect(bookingState(booking({ status: 'Cancelled' }), new Date('2026-01-01T00:00:00Z'))).toBe(
      'cancelled',
    );
  });
});

describe('parsePage', () => {
  it.each([
    ['3', 3],
    [undefined, 1],
    ['0', 1],
    ['-2', 1],
    ['1.5', 1],
    ['two', 1],
  ])('reads %s as page %i', (value, expected) => {
    expect(parsePage(value)).toBe(expected);
  });
});

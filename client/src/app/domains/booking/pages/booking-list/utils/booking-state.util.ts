import { IBooking } from '../../../../../core/entities/bookings/booking.dto';

export type TBookingState = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';

/** Where a booking stands now: cancelled, not started yet, happening, or over. */
export function bookingState(booking: IBooking, now: Date): TBookingState {
  if (booking.status === 'Cancelled') {
    return 'cancelled';
  }

  if (Date.parse(booking.start) > now.getTime()) {
    return 'upcoming';
  }

  return Date.parse(booking.end) > now.getTime() ? 'in-progress' : 'completed';
}

/** The page number from the query string: a whole number from 1, or 1 for anything else. */
export function parsePage(value: string | null | undefined): number {
  const page = Number(value);

  return Number.isInteger(page) && page >= 1 ? page : 1;
}

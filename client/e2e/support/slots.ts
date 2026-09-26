import { addDays, toVenueIso, venueToday } from '../../src/app/core/utils/venue-time.util';

const VENUE_TIME_ZONE = 'Europe/Kyiv';

export type TSlot = {
  /** Venue-local date, `YYYY-MM-DD`. */
  date: string;
  from: string;
  to: string;
  start: string;
  end: string;
};

/** A venue-local date some days from today. */
export function futureDate(daysAhead: number): string {
  return addDays(venueToday(new Date(), VENUE_TIME_ZONE), daysAhead);
}

/** A random date between 2 and 300 days ahead, safely bookable and away from other tests' dates. */
export function randomFutureDate(): string {
  return futureDate(2 + Math.floor(Math.random() * 298));
}

/** A slot on a venue-local date, with the ISO times the API takes. */
export function slot(date: string, from: string, to: string): TSlot {
  return {
    date,
    from,
    to,
    start: toVenueIso(date, from, VENUE_TIME_ZONE),
    end: toVenueIso(date, to, VENUE_TIME_ZONE),
  };
}

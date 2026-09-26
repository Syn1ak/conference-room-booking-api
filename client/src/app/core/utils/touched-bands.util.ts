import { IVenue, TTimeBandKind } from '../entities/venue/venue.dto';
import { minutesOfDay } from './venue-time.util';

/** The kinds of time band a slot overlaps, in time order and each once: 11:00–15:00 touches Standard and Peak. */
export function touchedBands(venue: IVenue, from: string, to: string): TTimeBandKind[] {
  const start = minutesOfDay(from);
  const end = minutesOfDay(to);
  const kinds = venue.bands
    .filter((band) => minutesOfDay(band.start) < end && start < minutesOfDay(band.end))
    .map((band) => band.band);

  return [...new Set(kinds)];
}

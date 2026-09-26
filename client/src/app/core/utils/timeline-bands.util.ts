import { IVenue } from '../entities/venue/venue.dto';
import { minutesOfDay } from './venue-time.util';

/** The venue's time bands in the shape the band timeline draws. */
export function timelineBands(venue: IVenue) {
  return venue.bands.map((band) => ({
    tone: band.band.toLowerCase() as 'morning' | 'standard' | 'peak' | 'evening',
    label: band.band,
    start: minutesOfDay(band.start),
    end: minutesOfDay(band.end),
    multiplier: band.multiplier,
  }));
}

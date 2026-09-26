import { IVenue } from '../entities/venue/venue.dto';

/** The venue rules the API returns, for tests. */
export const TEST_VENUE: IVenue = {
  timeZone: 'Europe/Kyiv',
  openingTime: '06:00:00',
  closingTime: '23:00:00',
  timeStepMinutes: 15,
  minimumDurationMinutes: 30,
  maximumYearsAhead: 1,
  bands: [
    { band: 'Morning', start: '06:00:00', end: '09:00:00', multiplier: 0.9 },
    { band: 'Standard', start: '09:00:00', end: '12:00:00', multiplier: 1 },
    { band: 'Peak', start: '12:00:00', end: '14:00:00', multiplier: 1.15 },
    { band: 'Standard', start: '14:00:00', end: '18:00:00', multiplier: 1 },
    { band: 'Evening', start: '18:00:00', end: '23:00:00', multiplier: 0.8 },
  ],
};

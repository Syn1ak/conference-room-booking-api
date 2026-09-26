export type TTimeBandKind = 'Morning' | 'Standard' | 'Peak' | 'Evening';

/** A span of the day with one rental rate. Times are `HH:mm:ss` in venue time; the end is excluded. */
export interface ITimeBand {
  band: TTimeBandKind;
  start: string;
  end: string;
  multiplier: number;
}

/** The rules every booking follows, from `GET /api/venue`. */
export interface IVenue {
  timeZone: string;
  openingTime: string;
  closingTime: string;
  timeStepMinutes: number;
  minimumDurationMinutes: number;
  maximumYearsAhead: number;
  bands: ITimeBand[];
}

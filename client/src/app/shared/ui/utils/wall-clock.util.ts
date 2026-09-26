export type TWallClock = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
};

const ISO_PREFIX = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/;

/**
 * Reads the date and time of day exactly as an ISO 8601 string writes them, ignoring its offset. The API sends times
 * in the venue's offset, so this is the venue's wall-clock time, whatever time zone the browser is in.
 */
export function parseWallClock(value: string): TWallClock | null {
  const match = ISO_PREFIX.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day, hours = '0', minutes = '0'] = match;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hours: Number(hours),
    minutes: Number(minutes),
  };
}

/** A Date whose UTC fields are the wall-clock fields, for formatting with `timeZone: 'UTC'`. */
export function wallClockAsUtcDate({ year, month, day, hours, minutes }: TWallClock): Date {
  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
}

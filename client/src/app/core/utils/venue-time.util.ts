import { IVenue } from '../entities/venue/venue.dto';

export type TSlotInput = {
  /** Venue-local date, `YYYY-MM-DD`. */
  date: string;
  /** Venue-local start, `HH:mm`. */
  from: string;
  /** Venue-local end, `HH:mm`. */
  to: string;
};

export type TSlotProblem = { field: keyof TSlotInput; message: string };

const MINUTES_PER_DAY = 24 * 60;

/** Minutes since midnight of an `HH:mm` or `HH:mm:ss` time. */
export function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);

  return hours * 60 + minutes;
}

/** `HH:mm` for a number of minutes since midnight. */
export function formatMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** How far ahead of UTC the time zone is at the given instant, in minutes. */
function offsetAt(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const wallClockAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );

  return Math.round((wallClockAsUtc - Math.floor(instant / 1000) * 1000) / 60_000);
}

/** The UTC instant of a venue-local date and time. */
export function venueInstant(date: string, time: string, timeZone: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const minutes = minutesOfDay(time);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);

  // The offset depends on the instant, which depends on the offset. Guess with the offset at the wall-clock time read
  // as UTC, then correct once: daylight-saving changes are hours apart, so one step always settles.
  const firstGuess = wallClockAsUtc - offsetAt(wallClockAsUtc, timeZone) * 60_000;

  return wallClockAsUtc - offsetAt(firstGuess, timeZone) * 60_000;
}

/**
 * An ISO 8601 time with the venue's offset for a venue-local date and time, for example `2026-10-01T10:00:00+03:00`,
 * the format the API requires.
 */
export function toVenueIso(date: string, time: string, timeZone: string): string {
  const offset = offsetAt(venueInstant(date, time, timeZone), timeZone);
  const sign = offset < 0 ? '-' : '+';

  return `${date}T${formatMinutes(minutesOfDay(time))}:00${sign}${formatMinutes(Math.abs(offset))}`;
}

/** Today's date in the venue, `YYYY-MM-DD`. */
export function venueToday(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Adds days to a `YYYY-MM-DD` date. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Every bookable time of day, from opening to closing on the time step: `06:00`, `06:15`, … `23:00`. */
export function timeOptions(venue: IVenue): string[] {
  const options: string[] = [];
  const closing = minutesOfDay(venue.closingTime);

  for (
    let minutes = minutesOfDay(venue.openingTime);
    minutes <= closing;
    minutes += venue.timeStepMinutes
  ) {
    options.push(formatMinutes(minutes));
  }

  return options;
}

/**
 * Checks a slot against the same rules the server applies, for instant feedback in forms. The server stays the judge:
 * its answer wins if the two ever disagree.
 */
export function slotProblems(slot: TSlotInput, now: Date, venue: IVenue): TSlotProblem[] {
  const problems: TSlotProblem[] = [];
  const from = minutesOfDay(slot.from);
  const to = minutesOfDay(slot.to);
  const opening = minutesOfDay(venue.openingTime);
  const closing = minutesOfDay(venue.closingTime);
  const hours = `${formatMinutes(opening)}–${formatMinutes(closing)}`;

  if (from < opening || from >= closing || from >= MINUTES_PER_DAY) {
    problems.push({ field: 'from', message: `Rooms are open ${hours}.` });
  } else if (from % venue.timeStepMinutes !== 0) {
    problems.push({ field: 'from', message: `Times go in ${venue.timeStepMinutes}-minute steps.` });
  }

  if (to <= from) {
    problems.push({ field: 'to', message: 'The end must be after the start.' });
  } else if (to > closing) {
    problems.push({ field: 'to', message: `Rooms are open ${hours}.` });
  } else if (to % venue.timeStepMinutes !== 0) {
    problems.push({ field: 'to', message: `Times go in ${venue.timeStepMinutes}-minute steps.` });
  } else if (to - from < venue.minimumDurationMinutes) {
    problems.push({
      field: 'to',
      message: `A booking lasts at least ${venue.minimumDurationMinutes} minutes.`,
    });
  }

  const start = venueInstant(slot.date, slot.from, venue.timeZone);
  const latestStart = new Date(now);
  latestStart.setUTCFullYear(latestStart.getUTCFullYear() + venue.maximumYearsAhead);

  if (slot.date < venueToday(now, venue.timeZone)) {
    problems.push({ field: 'date', message: 'Pick a date that is not in the past.' });
  } else if (start <= now.getTime()) {
    problems.push({ field: 'from', message: 'The start must be in the future.' });
  } else if (start > latestStart.getTime()) {
    problems.push({
      field: 'date',
      message: `Bookings can be made at most ${venue.maximumYearsAhead} year ahead.`,
    });
  }

  return problems;
}

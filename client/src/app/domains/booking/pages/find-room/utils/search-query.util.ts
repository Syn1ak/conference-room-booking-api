import { addDays } from '../../../../../core/utils/venue-time.util';
import { TRawSearchQuery, TSearchQuery } from '../models/search-query.types';

const DEFAULT_FROM = '10:00';
const DEFAULT_TO = '12:00';

function isDate(value: string | null | undefined): value is string {
  return (
    !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

/**
 * Reads a search from the query string. Anything missing or malformed falls back to a sensible default (tomorrow,
 * 10:00–12:00, one person), so a hand-edited or outdated link still opens a usable form.
 */
export function parseSearchQuery(
  raw: TRawSearchQuery,
  today: string,
  timeOptions: string[],
): TSearchQuery {
  const capacity = Number(raw.capacity);

  return {
    date: isDate(raw.date) ? raw.date : addDays(today, 1),
    from: raw.from && timeOptions.includes(raw.from) ? raw.from : DEFAULT_FROM,
    to: raw.to && timeOptions.includes(raw.to) ? raw.to : DEFAULT_TO,
    capacity: Number.isInteger(capacity) && capacity >= 1 ? capacity : 1,
  };
}

/** Whether the query string holds a whole search, which then runs right away. */
export function isCompleteSearch(raw: TRawSearchQuery): boolean {
  return !!raw.date && !!raw.from && !!raw.to && !!raw.capacity;
}

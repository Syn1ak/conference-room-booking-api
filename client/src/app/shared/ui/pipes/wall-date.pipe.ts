import { Pipe, PipeTransform } from '@angular/core';
import { parseWallClock, wallClockAsUtcDate } from '../utils/wall-clock.util';

export type TWallDateFormat = 'full' | 'long' | 'short';

const FORMATS: Record<TWallDateFormat, Intl.DateTimeFormat> = {
  full: new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }),
  long: new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }),
  short: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
};

/**
 * Formats the date of an ISO string as written, for example `Thu, 1 Oct 2026`, without converting it to the browser's
 * time zone.
 */
@Pipe({ name: 'wallDate' })
export class WallDatePipe implements PipeTransform {
  transform(value: string | null | undefined, format: TWallDateFormat = 'full'): string {
    if (!value) {
      return '';
    }

    const wallClock = parseWallClock(value);

    return wallClock ? FORMATS[format].format(wallClockAsUtcDate(wallClock)) : value;
  }
}

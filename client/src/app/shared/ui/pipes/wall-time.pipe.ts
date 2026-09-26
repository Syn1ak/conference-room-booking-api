import { Pipe, PipeTransform } from '@angular/core';
import { parseWallClock } from '../utils/wall-clock.util';

/** `HH:mm` of an ISO time as written, or null if it isn't one. */
export function formatWallTime(value: string): string | null {
  const wallClock = parseWallClock(value);

  return wallClock
    ? `${String(wallClock.hours).padStart(2, '0')}:${String(wallClock.minutes).padStart(2, '0')}`
    : null;
}

/**
 * Formats the time of day of an ISO string as written, for example `10:00`, without converting it to the browser's
 * time zone.
 */
@Pipe({ name: 'wallTime' })
export class WallTimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? (formatWallTime(value) ?? value) : '';
  }
}

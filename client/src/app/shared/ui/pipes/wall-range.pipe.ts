import { Pipe, PipeTransform } from '@angular/core';
import { formatWallTime } from './wall-time.pipe';

/**
 * Formats a start and an end as a range of times of day, for example `10:00–14:00`.
 */
@Pipe({ name: 'wallRange' })
export class WallRangePipe implements PipeTransform {
  transform(start: string | null | undefined, end: string | null | undefined): string {
    if (!start || !end) {
      return '';
    }

    return `${formatWallTime(start) ?? start}–${formatWallTime(end) ?? end}`;
  }
}

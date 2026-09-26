import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a number of minutes as hours and minutes, for example `1 h 30 min`.
 */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined || minutes < 0) {
      return '';
    }

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    if (hours === 0) {
      return `${rest} min`;
    }

    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
  }
}

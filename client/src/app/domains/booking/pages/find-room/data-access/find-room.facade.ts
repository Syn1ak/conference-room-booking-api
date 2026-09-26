import { inject, Injectable } from '@angular/core';
import { VenueStore } from '../../../../../core/services/venue/venue.store';
import { timelineBands } from '../../../../../core/utils/timeline-bands.util';
import {
  slotProblems,
  timeOptions,
  TSlotInput,
  venueToday,
} from '../../../../../core/utils/venue-time.util';

/**
 * The room search page's data and rules. Provided by the page.
 */
@Injectable()
export class FindRoomFacade {
  private readonly venue = inject(VenueStore).venue;

  readonly bands = timelineBands(this.venue);
  readonly timeOptions = timeOptions(this.venue);
  /** The first bookable start is always before closing, so the last option is only ever an end time. */
  readonly startOptions = this.timeOptions.slice(0, -1);
  readonly endOptions = this.timeOptions.slice(1);

  today(): string {
    return venueToday(new Date(), this.venue.timeZone);
  }

  /** What's wrong with a slot for one of its fields, by the same rules the server applies. */
  problemFor(field: keyof TSlotInput, slot: TSlotInput): string | undefined {
    return slotProblems(slot, new Date(), this.venue).find((problem) => problem.field === field)
      ?.message;
  }
}

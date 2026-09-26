import { computed, inject, Injectable, Signal } from '@angular/core';
import { IAvailableRoom } from '../../../../../core/entities/rooms/room.dto';
import { RoomsClient } from '../../../../../core/services/api/rooms/rooms.client';
import { toApiError } from '../../../../../core/utils/api-error.util';
import { touchedBands } from '../../../../../core/utils/touched-bands.util';
import { VenueStore } from '../../../../../core/services/venue/venue.store';
import { timelineBands } from '../../../../../core/utils/timeline-bands.util';
import { TSearchQuery } from '../models/search-query.types';
import {
  slotProblems,
  toVenueIso,
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
  private readonly roomsClient = inject(RoomsClient);

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

  /** Whether a search can be sent: the server would accept its slot and headcount. */
  isBookable(query: TSearchQuery): boolean {
    return slotProblems(query, new Date(), this.venue).length === 0 && query.capacity >= 1;
  }

  /**
   * The rooms free for the search, loaded whenever it changes. Must be called in an injection context; nothing is
   * requested while the search is null.
   */
  createSearch($query: Signal<TSearchQuery | null>) {
    const $availability = computed(() => {
      const query = $query();

      return query
        ? {
            start: toVenueIso(query.date, query.from, this.venue.timeZone),
            end: toVenueIso(query.date, query.to, this.venue.timeZone),
            capacity: query.capacity,
          }
        : null;
    });
    const rooms = this.roomsClient.availableRoomsResource($availability);

    return {
      $query,
      $rooms: computed<IAvailableRoom[]>(() => (rooms.hasValue() ? rooms.value() : [])),
      // Only a new search shows placeholders; a refresh keeps the current results on screen until it's done.
      $isLoading: computed(() => rooms.status() === 'loading'),
      $error: computed(() => (rooms.status() === 'error' ? toApiError(rooms.error()) : null)),
      $bands: computed(() => {
        const query = $query();

        return query ? touchedBands(this.venue, query.from, query.to) : [];
      }),
      reload: () => rooms.reload(),
    };
  }
}

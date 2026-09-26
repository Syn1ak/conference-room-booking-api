import { computed, inject, Injectable } from '@angular/core';
import { RoomsClient } from '../../../../../core/services/api/rooms/rooms.client';
import { VenueStore } from '../../../../../core/services/venue/venue.store';
import { timelineBands } from '../../../../../core/utils/timeline-bands.util';

/**
 * The room catalogue page's data: every room with its services, and the day's rates. Provided by the page, so the
 * request lives and dies with it.
 */
@Injectable()
export class RoomListFacade {
  private readonly rooms = inject(RoomsClient).roomsResource();

  /** The venue rules are loaded before any page renders, and don't change while the app runs. */
  readonly bands = timelineBands(inject(VenueStore).venue);

  readonly $rooms = computed(() => (this.rooms.hasValue() ? this.rooms.value() : []));
  readonly $isLoading = computed(() => this.rooms.isLoading() && !this.rooms.hasValue());
  readonly $hasError = computed(() => this.rooms.status() === 'error');

  reload(): void {
    this.rooms.reload();
  }
}

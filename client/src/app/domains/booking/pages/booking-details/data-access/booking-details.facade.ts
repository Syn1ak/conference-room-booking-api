import { computed, inject, Injectable, Signal } from '@angular/core';
import { BookingsClient } from '../../../../../core/services/api/bookings/bookings.client';
import { RoomsClient } from '../../../../../core/services/api/rooms/rooms.client';
import { toApiError } from '../../../../../core/utils/api-error.util';
import { bookingState } from '../../../utils/booking-state.util';

/**
 * The booking details page's data: the booking and its room's name. Provided by the page.
 */
@Injectable()
export class BookingDetailsFacade {
  private readonly bookingsClient = inject(BookingsClient);
  private readonly rooms = inject(RoomsClient).roomsResource();

  /** Loads the booking whenever the id changes. Must be called in an injection context. */
  createDetails($id: Signal<string>) {
    const booking = this.bookingsClient.bookingResource($id);

    return {
      $booking: computed(() => (booking.hasValue() ? booking.value() : null)),
      $roomName: computed(() => {
        const roomId = booking.hasValue() ? booking.value().roomId : null;
        const rooms = this.rooms.hasValue() ? this.rooms.value() : [];

        return rooms.find((room) => room.id === roomId)?.name ?? 'Room';
      }),
      $state: computed(() =>
        booking.hasValue() ? bookingState(booking.value(), new Date()) : null,
      ),
      $isLoading: computed(() => booking.status() === 'loading'),
      $isNotFound: computed(
        () => booking.status() === 'error' && toApiError(booking.error()).status === 404,
      ),
      $hasError: computed(
        () => booking.status() === 'error' && toApiError(booking.error()).status !== 404,
      ),
      reload: () => booking.reload(),
    };
  }
}

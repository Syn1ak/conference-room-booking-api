import { computed, inject, Injectable, Signal } from '@angular/core';
import { IBooking } from '../../../../../core/entities/bookings/booking.dto';
import { BookingsClient } from '../../../../../core/services/api/bookings/bookings.client';
import { RoomsClient } from '../../../../../core/services/api/rooms/rooms.client';
import { bookingState, TBookingState } from '../../../utils/booking-state.util';

export const BOOKINGS_PAGE_SIZE = 10;

export type TBookingRow = {
  booking: IBooking;
  roomName: string;
  state: TBookingState;
};

/**
 * The bookings list page's data: a page of bookings, with each booking's room by name. Provided by the page.
 */
@Injectable()
export class BookingListFacade {
  private readonly bookingsClient = inject(BookingsClient);
  private readonly rooms = inject(RoomsClient).roomsResource();

  /** Loads the page whenever the page number changes. Must be called in an injection context. */
  createList($page: Signal<number>) {
    const bookings = this.bookingsClient.bookingsResource(
      computed(() => ({ page: $page(), pageSize: BOOKINGS_PAGE_SIZE })),
    );
    const $roomNames = computed(
      () =>
        new Map(
          (this.rooms.hasValue() ? this.rooms.value() : []).map((room) => [room.id, room.name]),
        ),
    );

    return {
      $rows: computed<TBookingRow[]>(() => {
        const roomNames = $roomNames();
        const now = new Date();

        return (bookings.hasValue() ? bookings.value().items : []).map((booking) => ({
          booking,
          // Booked rooms can't be deleted (ADR 0003), so the name is only missing while the rooms load.
          roomName: roomNames.get(booking.roomId) ?? 'Room',
          state: bookingState(booking, now),
        }));
      }),
      $totalCount: computed(() => (bookings.hasValue() ? bookings.value().totalCount : 0)),
      $totalPages: computed(() =>
        bookings.hasValue()
          ? Math.max(1, Math.ceil(bookings.value().totalCount / BOOKINGS_PAGE_SIZE))
          : 1,
      ),
      $isLoading: computed(
        () => bookings.status() === 'loading' || this.rooms.status() === 'loading',
      ),
      $hasError: computed(() => bookings.status() === 'error' || this.rooms.status() === 'error'),
      reload: () => {
        bookings.reload();
        this.rooms.reload();
      },
    };
  }
}

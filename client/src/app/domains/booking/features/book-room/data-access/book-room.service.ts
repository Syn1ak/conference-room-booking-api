import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IBookingConfirmation } from '../../../../../core/entities/bookings/booking.dto';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/error.interceptor';
import { BookingsClient } from '../../../../../core/services/api/bookings/bookings.client';
import { VenueStore } from '../../../../../core/services/venue/venue.store';
import { toVenueIso } from '../../../../../core/utils/venue-time.util';
import { TBookRoomData } from '../models/book-room.types';

/**
 * Books a room for the signed-in client. The server calculates the price; nothing the client shows is sent as one.
 */
@Injectable({ providedIn: 'root' })
export class BookRoomService {
  private readonly bookings = inject(BookingsClient);
  private readonly venue = inject(VenueStore);

  /** Rejects with the HTTP error when the server refuses the booking. */
  book(
    data: TBookRoomData,
    attendeeCount: number,
    serviceIds: string[],
  ): Promise<IBookingConfirmation> {
    const { timeZone } = this.venue.venue;

    const request = {
      roomId: data.room.id,
      start: toVenueIso(data.date, data.from, timeZone),
      end: toVenueIso(data.date, data.to, timeZone),
      attendeeCount,
      serviceIds,
    };

    // The dialog explains every failure itself, next to the booking it's about.
    return firstValueFrom(
      this.bookings.create$(request, new HttpContext().set(SKIP_ERROR_TOAST, true)),
    );
  }
}

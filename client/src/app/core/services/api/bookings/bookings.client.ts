import { HttpClient, HttpContext, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable, Signal } from '@angular/core';
import { Observable } from 'rxjs';
import {
  IBooking,
  IBookingConfirmation,
  ICreateBookingRequest,
} from '../../../entities/bookings/booking.dto';
import { IPage } from '../../../entities/common/page.dto';

export type TBookingsPageQuery = { page: number; pageSize: number };

/**
 * The bookings endpoints of the API. Resources must be created in an injection context, such as a page's facade.
 */
@Injectable({ providedIn: 'root' })
export class BookingsClient {
  private readonly http = inject(HttpClient);

  create$(request: ICreateBookingRequest, context?: HttpContext): Observable<IBookingConfirmation> {
    return this.http.post<IBookingConfirmation>('/api/bookings', request, { context });
  }

  /** Cancels one of the signed-in client's bookings before it starts. */
  cancel$(id: string, context?: HttpContext): Observable<IBooking> {
    return this.http.post<IBooking>(`/api/bookings/${id}/cancel`, null, { context });
  }

  /** A page of the bookings the caller may see: a client's own, or every client's for an admin. */
  bookingsResource(
    $query: Signal<TBookingsPageQuery>,
  ): HttpResourceRef<IPage<IBooking> | undefined> {
    return httpResource<IPage<IBooking>>(() => ({ url: '/api/bookings', params: { ...$query() } }));
  }
}

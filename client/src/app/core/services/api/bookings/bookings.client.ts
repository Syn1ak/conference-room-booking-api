import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  IBookingConfirmation,
  ICreateBookingRequest,
} from '../../../entities/bookings/booking.dto';

/** The bookings endpoints of the API. */
@Injectable({ providedIn: 'root' })
export class BookingsClient {
  private readonly http = inject(HttpClient);

  create$(request: ICreateBookingRequest): Observable<IBookingConfirmation> {
    return this.http.post<IBookingConfirmation>('/api/bookings', request);
  }
}

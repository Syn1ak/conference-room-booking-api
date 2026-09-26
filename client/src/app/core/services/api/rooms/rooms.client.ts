import { HttpClient, HttpContext, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable, Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { IAvailableRoom, IRoom } from '../../../entities/rooms/room.dto';

export type TAvailabilityQuery = {
  /** ISO time with offset, for example 2026-10-01T10:00:00+03:00. */
  start: string;
  end: string;
  capacity: number;
};

/**
 * The rooms endpoints of the API. Resources must be created in an injection context, such as a page's facade, and
 * live as long as it does.
 */
@Injectable({ providedIn: 'root' })
export class RoomsClient {
  private readonly http = inject(HttpClient);

  roomsResource(): HttpResourceRef<IRoom[] | undefined> {
    return httpResource<IRoom[]>(() => '/api/rooms');
  }

  /** The rooms free for the query, reloaded whenever it changes. Nothing is requested while the query is null. */
  availableRoomsResource(
    $query: Signal<TAvailabilityQuery | null>,
  ): HttpResourceRef<IAvailableRoom[] | undefined> {
    return httpResource<IAvailableRoom[]>(() => {
      const query = $query();

      return query ? { url: '/api/rooms/available', params: { ...query } } : undefined;
    });
  }

  delete$(id: string, context?: HttpContext): Observable<void> {
    return this.http.delete<void>(`/api/rooms/${id}`, { context });
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IVenue } from '../../../entities/venue/venue.dto';

/** The venue endpoint of the API. */
@Injectable({ providedIn: 'root' })
export class VenueClient {
  private readonly http = inject(HttpClient);

  getVenue$(): Observable<IVenue> {
    return this.http.get<IVenue>('/api/venue');
  }
}

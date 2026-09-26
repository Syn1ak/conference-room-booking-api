import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IVenue } from '../../../entities/venue/venue.dto';
import { SKIP_ERROR_TOAST } from '../../../interceptors/error.interceptor';

/** The venue endpoint of the API. */
@Injectable({ providedIn: 'root' })
export class VenueClient {
  private readonly http = inject(HttpClient);

  getVenue$(): Observable<IVenue> {
    // A failure shows the full-page retry screen, so a toast would say the same thing twice.
    return this.http.get<IVenue>('/api/venue', {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}

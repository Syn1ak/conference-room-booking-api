import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IVenue } from '../../entities/venue/venue.dto';
import { VenueClient } from '../api/venue/venue.client';

export type TVenueStatus = 'loading' | 'ready' | 'error';

/**
 * The venue's booking rules, loaded once before the app renders. Pages only render once they're ready, so they can
 * read `venue` without checking.
 */
@Injectable({ providedIn: 'root' })
export class VenueStore {
  private readonly client = inject(VenueClient);
  private readonly $loaded = signal<IVenue | null>(null);

  readonly $status = signal<TVenueStatus>('loading');
  readonly $venue = this.$loaded.asReadonly();

  /** The rules. Only read it once `$status()` is `ready`. */
  get venue(): IVenue {
    const venue = this.$loaded();
    if (!venue) {
      throw new Error('The venue rules are read before they have loaded.');
    }

    return venue;
  }

  /** Loads the rules. Never rejects: a failure shows as the `error` status, with a retry. */
  async load(): Promise<void> {
    this.$status.set('loading');

    try {
      this.$loaded.set(await firstValueFrom(this.client.getVenue$()));
      this.$status.set('ready');
    } catch {
      this.$status.set('error');
    }
  }
}

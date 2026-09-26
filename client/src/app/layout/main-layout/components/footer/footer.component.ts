import { Component, inject } from '@angular/core';
import { VenueStore } from '../../../../core/services/venue/venue.store';

/**
 * The page footer, which also says which time zone the times are in.
 */
@Component({
  selector: 'app-footer',
  template: `
    <div
      class="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-ink-subtle sm:flex-row sm:justify-between sm:px-6"
    >
      <p>© {{ year }} Conference Rooms</p>
      <p>Prices in UAH · Times in venue time ({{ venue.venue.timeZone }})</p>
    </div>
  `,
  host: { role: 'contentinfo', class: 'block border-t border-line' },
})
export class FooterComponent {
  protected readonly venue = inject(VenueStore);
  protected readonly year = new Date().getFullYear();
}

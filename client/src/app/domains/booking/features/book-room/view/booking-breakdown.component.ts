import { Component, computed, input } from '@angular/core';
import { IBookingConfirmation } from '../../../../../core/entities/bookings/booking.dto';
import {
  BadgeComponent,
  TBadgeTone,
} from '../../../../../shared/ui/components/badge/badge.component';
import { DurationPipe } from '../../../../../shared/ui/pipes/duration.pipe';
import { UahPipe } from '../../../../../shared/ui/pipes/uah.pipe';
import { WallRangePipe } from '../../../../../shared/ui/pipes/wall-range.pipe';

/**
 * How a booking's price adds up, as the server calculated it: the rental per time band, each service, and the total.
 */
@Component({
  selector: 'app-booking-breakdown',
  imports: [BadgeComponent, DurationPipe, UahPipe, WallRangePipe],
  template: `
    <table class="w-full text-sm">
      <caption class="sr-only">
        Price breakdown
      </caption>
      <thead class="sr-only">
        <tr>
          <th scope="col">Item</th>
          <th scope="col">Time</th>
          <th scope="col">Rate</th>
          <th scope="col">Amount</th>
        </tr>
      </thead>
      <tbody>
        @for (line of $lines(); track line.start) {
          <tr class="border-b border-line">
            <td class="py-2.5 pr-3">
              <app-badge [tone]="line.tone">{{ line.band }}</app-badge>
            </td>
            <td class="py-2.5 pr-3 text-ink-muted tabular-nums">
              {{ line.start | wallRange: line.end }} · {{ line.minutes | duration }}
            </td>
            <td class="py-2.5 pr-3 text-ink-muted tabular-nums">×{{ line.multiplier }}</td>
            <td class="py-2.5 text-right text-ink tabular-nums">{{ line.amount | uah }}</td>
          </tr>
        }
        @for (service of $booking().services; track service.serviceId) {
          <tr class="border-b border-line">
            <td class="py-2.5 pr-3 text-ink" colspan="3">{{ service.name }}</td>
            <td class="py-2.5 text-right text-ink tabular-nums">{{ service.price | uah }}</td>
          </tr>
        }
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" class="pt-3 text-left font-semibold text-ink" colspan="3">Total</th>
          <td class="pt-3 text-right text-base font-semibold text-ink tabular-nums">
            {{ $booking().totalPrice | uah }}
          </td>
        </tr>
      </tfoot>
    </table>
  `,
})
export class BookingBreakdownComponent {
  readonly $booking = input.required<IBookingConfirmation>({ alias: 'booking' });

  protected readonly $lines = computed(() =>
    this.$booking().rentalLines.map((line) => ({
      ...line,
      tone: line.band.toLowerCase() as TBadgeTone,
      minutes: Math.round(line.hours * 60),
    })),
  );
}

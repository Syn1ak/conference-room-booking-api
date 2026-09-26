import { Component, computed, input } from '@angular/core';
import { BadgeComponent, TBadgeTone } from '../../../../shared/ui/components/badge/badge.component';
import { TBookingState } from '../../utils/booking-state.util';

const STATES: Record<TBookingState, { label: string; tone: TBadgeTone }> = {
  upcoming: { label: 'Upcoming', tone: 'brand' },
  'in-progress': { label: 'In progress', tone: 'success' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

/**
 * Where a booking stands, as a coloured badge: upcoming, in progress, completed, or cancelled.
 */
@Component({
  selector: 'app-booking-status-badge',
  imports: [BadgeComponent],
  template: '<app-badge [tone]="$status().tone">{{ $status().label }}</app-badge>',
})
export class BookingStatusBadgeComponent {
  readonly $state = input.required<TBookingState>({ alias: 'state' });

  protected readonly $status = computed(() => STATES[this.$state()]);
}

import { Component, computed, input } from '@angular/core';
import { Clock, Users } from 'lucide';
import {
  BadgeComponent,
  TBadgeTone,
} from '../../../../../../shared/ui/components/badge/badge.component';
import { IconComponent } from '../../../../../../shared/ui/components/icon/icon.component';
import { DurationPipe } from '../../../../../../shared/ui/pipes/duration.pipe';
import { UahPipe } from '../../../../../../shared/ui/pipes/uah.pipe';
import { WallDatePipe } from '../../../../../../shared/ui/pipes/wall-date.pipe';
import { WallRangePipe } from '../../../../../../shared/ui/pipes/wall-range.pipe';
import { TBookingRow } from '../../data-access/booking-list.facade';
import { TBookingState } from '../../utils/booking-state.util';

const STATES: Record<TBookingState, { label: string; tone: TBadgeTone }> = {
  upcoming: { label: 'Upcoming', tone: 'brand' },
  'in-progress': { label: 'In progress', tone: 'success' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

/**
 * One booking in the list: a calendar tile for its date, the room and time, its status, and what it costs. Project
 * actions, such as cancelling, into it.
 */
@Component({
  selector: 'app-booking-row',
  imports: [BadgeComponent, DurationPipe, IconComponent, UahPipe, WallDatePipe, WallRangePipe],
  template: `
    <div
      class="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl ring-1"
      [class]="
        $isInactive()
          ? 'bg-surface-muted text-ink-subtle ring-line'
          : 'bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20'
      "
      aria-hidden="true"
    >
      <span class="text-[11px] font-medium uppercase">{{
        $row().booking.start | wallDate: 'month'
      }}</span>
      <span class="text-xl leading-none font-semibold">{{
        $row().booking.start | wallDate: 'day'
      }}</span>
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <h3
          class="truncate font-semibold text-ink"
          [class.line-through]="$row().state === 'cancelled'"
        >
          {{ $row().roomName }}
        </h3>
        <app-badge [tone]="$status().tone">{{ $status().label }}</app-badge>
      </div>
      <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
        <span>{{ $row().booking.start | wallDate }}</span>
        <span class="flex items-center gap-1">
          <app-icon [icon]="icons.Clock" class="size-3.5" />
          {{ $row().booking.start | wallRange: $row().booking.end }} ·
          {{ $row().booking.durationMinutes | duration }}
        </span>
        <span class="flex items-center gap-1">
          <app-icon [icon]="icons.Users" class="size-3.5" />
          {{ $row().booking.attendeeCount }}
        </span>
        @if ($showClient()) {
          <span class="font-mono text-xs" [title]="$row().booking.clientId">
            Client {{ $row().booking.clientId.slice(0, 8) }}
          </span>
        }
      </p>
    </div>

    <div class="flex shrink-0 flex-col items-end gap-2">
      <p
        class="font-semibold tabular-nums"
        [class]="$row().state === 'cancelled' ? 'text-ink-subtle line-through' : 'text-ink'"
      >
        {{ $row().booking.totalPrice | uah }}
      </p>
      <ng-content />
    </div>
  `,
  host: { class: 'flex items-center gap-4 px-4 py-4 sm:px-6' },
})
export class BookingRowComponent {
  protected readonly icons = { Clock, Users };

  readonly $row = input.required<TBookingRow>({ alias: 'row' });
  readonly $showClient = input(false, { alias: 'showClient' });

  protected readonly $status = computed(() => STATES[this.$row().state]);
  protected readonly $isInactive = computed(() => {
    const state = this.$row().state;

    return state === 'cancelled' || state === 'completed';
  });
}

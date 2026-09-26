import { Component, computed, input } from '@angular/core';
import { Users } from 'lucide';
import { IAvailableRoom } from '../../../../../../core/entities/rooms/room.dto';
import { TTimeBandKind } from '../../../../../../core/entities/venue/venue.dto';
import {
  BadgeComponent,
  TBadgeTone,
} from '../../../../../../shared/ui/components/badge/badge.component';
import { IconComponent } from '../../../../../../shared/ui/components/icon/icon.component';
import { UahPipe } from '../../../../../../shared/ui/pipes/uah.pipe';

/**
 * A room free for the searched time, with its rental price for exactly that time.
 */
@Component({
  selector: 'app-available-room-card',
  imports: [BadgeComponent, IconComponent, UahPipe],
  template: `
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h3 class="text-lg font-semibold tracking-tight text-ink">{{ $room().name }}</h3>
        <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <span class="flex items-center gap-1.5">
            <app-icon [icon]="icons.Users" class="size-4" />
            Up to {{ $room().capacity }} people
          </span>
          <span>{{ $room().hourlyPrice | uah }} / hour base</span>
        </p>
        <div class="mt-3 flex flex-wrap gap-1.5">
          @for (band of $bandBadges(); track band.kind) {
            <app-badge [tone]="band.tone">{{ band.kind }}</app-badge>
          }
          @for (service of $room().services; track service.serviceId) {
            <app-badge>{{ service.name }} · {{ service.price | uah }}</app-badge>
          }
        </div>
      </div>
      <div class="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
        <div class="sm:text-right">
          <p class="text-2xl font-semibold tracking-tight text-ink tabular-nums">
            {{ $room().rentalPrice | uah }}
          </p>
          <p class="text-xs text-ink-subtle">rental for your time, before services</p>
        </div>
        <ng-content />
      </div>
    </div>
  `,
  host: {
    class:
      'block rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-float sm:p-6',
  },
})
export class AvailableRoomCardComponent {
  protected readonly icons = { Users };

  readonly $room = input.required<IAvailableRoom>({ alias: 'room' });
  readonly $bands = input.required<TTimeBandKind[]>({ alias: 'bands' });

  protected readonly $bandBadges = computed(() =>
    this.$bands().map((kind) => ({ kind, tone: kind.toLowerCase() as TBadgeTone })),
  );
}

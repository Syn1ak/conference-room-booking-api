import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowRight, Users } from 'lucide';
import { IRoom } from '../../../../../../core/entities/rooms/room.dto';
import { ButtonComponent } from '../../../../../../shared/ui/components/button/button.component';
import { IconComponent } from '../../../../../../shared/ui/components/icon/icon.component';
import { UahPipe } from '../../../../../../shared/ui/pipes/uah.pipe';

/**
 * One room in the catalogue: its size, hourly rate, and services, with a link to check when it's free.
 */
@Component({
  selector: 'app-room-card',
  imports: [RouterLink, ButtonComponent, IconComponent, UahPipe],
  template: `
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h2 class="truncate text-lg font-semibold tracking-tight text-ink">{{ $room().name }}</h2>
        <p class="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
          <app-icon [icon]="icons.Users" class="size-4" />
          Up to {{ $room().capacity }} people
        </p>
      </div>
      <div class="shrink-0 text-right">
        <p class="text-lg font-semibold text-ink tabular-nums">{{ $room().hourlyPrice | uah }}</p>
        <p class="text-xs text-ink-subtle">per hour, base rate</p>
      </div>
    </div>

    <div class="mt-5 flex-1">
      <p class="text-xs font-medium tracking-wide text-ink-subtle uppercase">Services</p>
      @if ($room().services.length > 0) {
        <ul class="mt-2 flex flex-wrap gap-2">
          @for (service of $room().services; track service.serviceId) {
            <li
              class="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1 text-xs text-ink ring-1 ring-line"
            >
              {{ service.name }}
              <span class="text-ink-subtle tabular-nums">{{ service.price | uah }}</span>
            </li>
          }
        </ul>
      } @else {
        <p class="mt-2 text-sm text-ink-muted">No extra services.</p>
      }
    </div>

    <a
      app-button
      variant="secondary"
      class="mt-6 w-full"
      routerLink="/"
      [queryParams]="{ capacity: $room().capacity }"
    >
      Check availability
      <app-icon [icon]="icons.ArrowRight" class="size-4" />
    </a>
  `,
  host: {
    class:
      'flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-float sm:p-6',
  },
})
export class RoomCardComponent {
  protected readonly icons = { ArrowRight, Users };

  readonly $room = input.required<IRoom>({ alias: 'room' });
}

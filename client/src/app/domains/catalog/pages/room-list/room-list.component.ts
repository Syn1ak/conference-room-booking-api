import { Component, inject } from '@angular/core';
import { DoorClosed } from 'lucide';
import { BandTimelineComponent } from '../../../../shared/ui/components/band-timeline/band-timeline.component';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { EmptyStateComponent } from '../../../../shared/ui/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/ui/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { RoomListFacade } from './data-access/room-list.facade';
import { RoomCardComponent } from './view/components/room-card.component';

/**
 * The public catalogue of rooms, with how the rental rate changes through the day.
 */
@Component({
  selector: 'app-room-list',
  imports: [
    BandTimelineComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    RoomCardComponent,
    SkeletonComponent,
  ],
  providers: [RoomListFacade],
  template: `
    <app-page-header
      title="Our rooms"
      description="Every room comes with its own set of services. Pick one that fits your group, then check when it's free."
    />

    <app-card class="mt-8">
      <h2 class="text-sm font-semibold text-ink">Rates change through the day</h2>
      <p class="mt-1 text-sm text-ink-muted">
        The hourly rate is discounted in the morning and evening, and higher at peak hours. You pay
        for exactly the time you book.
      </p>
      <app-band-timeline class="mt-5" [bands]="facade.bands" />
    </app-card>

    <section class="mt-8" aria-label="Rooms">
      @if (facade.$isLoading()) {
        <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          @for (placeholder of [1, 2, 3]; track placeholder) {
            <app-card>
              <app-skeleton class="h-6 w-1/2" />
              <app-skeleton class="mt-2 h-4 w-1/3" />
              <app-skeleton class="mt-8 h-7 w-full" />
              <app-skeleton class="mt-6 h-10 w-full rounded-xl" />
            </app-card>
          }
        </div>
      } @else if (facade.$hasError()) {
        <app-card [padded]="false">
          <app-error-state title="Couldn't load the rooms" (retry)="facade.reload()" />
        </app-card>
      } @else if (facade.$rooms().length === 0) {
        <app-card [padded]="false">
          <app-empty-state
            title="No rooms yet"
            description="Rooms appear here as soon as staff add them."
          >
            <app-icon appEmptyIcon [icon]="icons.DoorClosed" class="size-6" />
          </app-empty-state>
        </app-card>
      } @else {
        <ul class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          @for (room of facade.$rooms(); track room.id) {
            <li class="flex"><app-room-card class="w-full" [room]="room" /></li>
          }
        </ul>
      }
    </section>
  `,
})
export default class RoomListComponent {
  protected readonly icons = { DoorClosed };
  protected readonly facade = inject(RoomListFacade);
}

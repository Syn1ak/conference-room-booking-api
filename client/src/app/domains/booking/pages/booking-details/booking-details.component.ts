import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowLeft, CalendarDays, Clock, SearchX, Users } from 'lucide';
import { SessionStore } from '../../../../core/services/session/session.store';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { EmptyStateComponent } from '../../../../shared/ui/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { DurationPipe } from '../../../../shared/ui/pipes/duration.pipe';
import { UahPipe } from '../../../../shared/ui/pipes/uah.pipe';
import { WallDatePipe } from '../../../../shared/ui/pipes/wall-date.pipe';
import { WallRangePipe } from '../../../../shared/ui/pipes/wall-range.pipe';
import { WallTimePipe } from '../../../../shared/ui/pipes/wall-time.pipe';
import { CancelBookingService } from '../../data-access/cancel-booking.service';
import { BookingStatusBadgeComponent } from '../../view/components/booking-status-badge.component';
import { BookingDetailsFacade } from './data-access/booking-details.facade';

/**
 * One booking: when and where, who comes, the services, and the prices saved when it was made.
 */
@Component({
  selector: 'app-booking-details',
  imports: [
    RouterLink,
    BookingStatusBadgeComponent,
    ButtonComponent,
    CardComponent,
    DurationPipe,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    SkeletonComponent,
    UahPipe,
    WallDatePipe,
    WallRangePipe,
    WallTimePipe,
  ],
  providers: [BookingDetailsFacade],
  templateUrl: './booking-details.component.html',
})
export default class BookingDetailsComponent {
  protected readonly icons = { ArrowLeft, CalendarDays, Clock, SearchX, Users };
  protected readonly session = inject(SessionStore);
  private readonly cancelBooking = inject(CancelBookingService);

  /** The booking's id, from the route. */
  readonly $id = input.required<string>({ alias: 'id' });

  protected readonly details = inject(BookingDetailsFacade).createDetails(this.$id);
  protected readonly $canCancel = computed(
    () => this.session.$role() === 'Client' && this.details.$state() === 'upcoming',
  );

  protected async cancel(): Promise<void> {
    const booking = this.details.$booking();
    if (
      booking &&
      (await this.cancelBooking.cancel(booking, this.details.$roomName())) !== 'kept'
    ) {
      this.details.reload();
    }
  }
}

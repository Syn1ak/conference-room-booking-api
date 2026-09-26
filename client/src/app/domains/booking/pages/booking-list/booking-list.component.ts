import { Component, computed, DestroyRef, inject, input } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { CalendarPlus, CalendarX, ChevronLeft, ChevronRight } from 'lucide';
import { filter } from 'rxjs';
import { SessionStore } from '../../../../core/services/session/session.store';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { EmptyStateComponent } from '../../../../shared/ui/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/ui/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { CancelBookingService } from '../../data-access/cancel-booking.service';
import { BookingListFacade, TBookingRow } from './data-access/booking-list.facade';
import { parsePage } from './utils/booking-state.util';
import { BookingRowComponent } from './view/components/booking-row.component';

/**
 * The bookings the signed-in user may see, latest start first: a client's own, or every client's for staff.
 */
@Component({
  selector: 'app-booking-list',
  imports: [
    RouterLink,
    BookingRowComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
  ],
  providers: [BookingListFacade],
  templateUrl: './booking-list.component.html',
})
export default class BookingListComponent {
  protected readonly icons = { CalendarPlus, CalendarX, ChevronLeft, ChevronRight };
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  /** The page number from the query string. */
  readonly $pageParam = input<string | undefined>(undefined, { alias: 'page' });

  protected readonly $page = computed(() => parsePage(this.$pageParam()));
  protected readonly $isAdmin = computed(() => this.session.$role() === 'Admin');
  protected readonly list = inject(BookingListFacade).createList(this.$page);
  private readonly cancelBooking = inject(CancelBookingService);

  constructor() {
    // A page past the end, from an old link or after cancellations, moves to the last page that has bookings.
    toObservable(this.list.$totalPages)
      .pipe(
        filter((totalPages) => this.list.$totalCount() > 0 && this.$page() > totalPages),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((totalPages) =>
        this.router.navigate([], { queryParams: { page: totalPages }, replaceUrl: true }),
      );
  }

  protected async cancel(row: TBookingRow): Promise<void> {
    const outcome = await this.cancelBooking.cancel(row.booking, row.roomName);
    if (outcome !== 'kept') {
      this.list.reload();
    }
  }
}

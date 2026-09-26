import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IBooking } from '../../../core/entities/bookings/booking.dto';
import { SKIP_ERROR_TOAST } from '../../../core/interceptors/error.interceptor';
import { BookingsClient } from '../../../core/services/api/bookings/bookings.client';
import { ToastService } from '../../../core/services/toast/toast.service';
import { toApiError } from '../../../core/utils/api-error.util';
import { ConfirmDialogService } from '../../../shared/features/confirm-dialog/data-access/confirm-dialog.service';
import { formatWallDate } from '../../../shared/ui/pipes/wall-date.pipe';
import { formatWallTime } from '../../../shared/ui/pipes/wall-time.pipe';

/** How a cancellation ended. On anything but `kept`, the booking's state may have changed, so views reload. */
export type TCancelOutcome = 'cancelled' | 'kept' | 'refused';

/**
 * Cancels a client's booking after asking them to confirm, and tells them how it went.
 */
@Injectable({ providedIn: 'root' })
export class CancelBookingService {
  private readonly bookings = inject(BookingsClient);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toasts = inject(ToastService);
  private readonly cancelling = new Set<string>();

  async cancel(booking: IBooking, roomName: string): Promise<TCancelOutcome> {
    // A second click while the first cancellation is on its way does nothing.
    if (this.cancelling.has(booking.id)) {
      return 'kept';
    }

    const when = `${formatWallDate(booking.start)}, ${formatWallTime(booking.start)}–${formatWallTime(booking.end)}`;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Cancel this booking?',
      message: `${roomName} on ${when}. The room becomes free for others, and this can't be undone.`,
      confirmLabel: 'Cancel booking',
      cancelLabel: 'Keep it',
      tone: 'danger',
    });
    if (!confirmed) {
      return 'kept';
    }

    this.cancelling.add(booking.id);
    try {
      await firstValueFrom(
        this.bookings.cancel$(booking.id, new HttpContext().set(SKIP_ERROR_TOAST, true)),
      );
      this.toasts.success('Booking cancelled', `${roomName} on ${when} is free for others now.`);

      return 'cancelled';
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 404) {
        this.toasts.error("Couldn't cancel the booking", 'This booking no longer exists.');
      } else if (apiError.status === 409) {
        this.toasts.error("Couldn't cancel the booking", apiError.title);
      } else {
        this.toasts.error(
          "Couldn't cancel the booking",
          "We couldn't reach the server. Try again in a moment.",
        );
      }

      return 'refused';
    } finally {
      this.cancelling.delete(booking.id);
    }
  }
}

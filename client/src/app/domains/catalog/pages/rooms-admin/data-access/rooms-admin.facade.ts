import { HttpContext } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IRoom } from '../../../../../core/entities/rooms/room.dto';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/error.interceptor';
import { RoomsClient } from '../../../../../core/services/api/rooms/rooms.client';
import { ToastService } from '../../../../../core/services/toast/toast.service';
import { toApiError } from '../../../../../core/utils/api-error.util';
import { ConfirmDialogService } from '../../../../../shared/features/confirm-dialog/data-access/confirm-dialog.service';

/**
 * The rooms admin page's data and actions. Provided by the page.
 */
@Injectable()
export class RoomsAdminFacade {
  private readonly roomsClient = inject(RoomsClient);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toasts = inject(ToastService);
  private readonly rooms = this.roomsClient.roomsResource();

  readonly $rooms = computed(() => (this.rooms.hasValue() ? this.rooms.value() : []));
  readonly $isLoading = computed(() => this.rooms.status() === 'loading');
  readonly $hasError = computed(() => this.rooms.status() === 'error');

  reload(): void {
    this.rooms.reload();
  }

  /** Deletes a room after asking, and reloads the list however it went. */
  async delete(room: IRoom): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: `Delete ${room.name}?`,
      message:
        'The room and the services it offers are removed for good. A room that has ever been booked ' +
        "can't be deleted, only edited.",
      confirmLabel: 'Delete room',
      cancelLabel: 'Keep it',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      await firstValueFrom(
        this.roomsClient.delete$(room.id, new HttpContext().set(SKIP_ERROR_TOAST, true)),
      );
      this.toasts.success(`${room.name} deleted`);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 404) {
        this.toasts.info(`${room.name} was already deleted`);
      } else if (apiError.status === 409) {
        this.toasts.error(
          `Can't delete ${room.name}`,
          'It has bookings, which are kept for the records, so it can only be edited.',
        );
      } else {
        this.toasts.error(
          `Can't delete ${room.name}`,
          "We couldn't reach the server. Try again in a moment.",
        );
      }
    }

    this.reload();
  }
}

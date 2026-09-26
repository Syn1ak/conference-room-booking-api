import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  max,
  min,
  required,
  TreeValidationResult,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CircleCheck } from 'lucide';
import { IBookingConfirmation } from '../../../../../core/entities/bookings/booking.dto';
import { toApiError, toFormErrors } from '../../../../../core/utils/api-error.util';
import { minutesOfDay } from '../../../../../core/utils/venue-time.util';
import { AlertComponent } from '../../../../../shared/ui/components/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/components/button/button.component';
import { DialogShellComponent } from '../../../../../shared/ui/components/dialog-shell/dialog-shell.component';
import { IconComponent } from '../../../../../shared/ui/components/icon/icon.component';
import { FormFieldComponent } from '../../../../../shared/ui/components/form-field/form-field.component';
import { CheckboxDirective } from '../../../../../shared/ui/directives/checkbox.directive';
import { InputDirective } from '../../../../../shared/ui/directives/input.directive';
import { DurationPipe } from '../../../../../shared/ui/pipes/duration.pipe';
import { UahPipe } from '../../../../../shared/ui/pipes/uah.pipe';
import { WallDatePipe } from '../../../../../shared/ui/pipes/wall-date.pipe';
import { validationMessage } from '../../../../../shared/ui/utils/validation-message.util';
import { BookRoomService } from '../data-access/book-room.service';
import { TBookRoomData, TBookRoomResult } from '../models/book-room.types';
import { BookingBreakdownComponent } from './booking-breakdown.component';

const MESSAGES = {
  slotTaken:
    'Someone has just booked this room for some or all of this time. Close this and pick another room or time.',
  roomGone: 'This room no longer exists. Close this and pick another room.',
  servicesChanged:
    "The room's services have changed since you searched. Close this and open the booking again to see them.",
  unreachable: "We couldn't reach the server. Your choices are kept, so you can try again.",
};

type TBookingForm = {
  attendeeCount: number;
  services: { serviceId: string; selected: boolean }[];
};

/**
 * Books a room found by a search: how many people come and which services they want, with the price as it adds up.
 */
@Component({
  selector: 'app-book-room-dialog',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    AlertComponent,
    BookingBreakdownComponent,
    IconComponent,
    ButtonComponent,
    CheckboxDirective,
    DialogShellComponent,
    DurationPipe,
    FormFieldComponent,
    InputDirective,
    UahPipe,
    WallDatePipe,
  ],
  templateUrl: './book-room-dialog.component.html',
})
export class BookRoomDialogComponent {
  protected readonly icons = { CircleCheck };
  protected readonly data = inject<TBookRoomData>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<TBookRoomResult>>(DialogRef);
  private readonly bookRoom = inject(BookRoomService);

  /** The booking, once made; the dialog then shows its confirmation. */
  protected readonly $booking = signal<IBookingConfirmation | null>(null);

  /**
   * Why the last attempt failed, when it isn't about a field. Kept out of the form's errors, which would block trying
   * again until something was edited.
   */
  protected readonly $submitError = signal<string | null>(null);

  protected readonly durationMinutes = minutesOfDay(this.data.to) - minutesOfDay(this.data.from);

  protected readonly model = signal<TBookingForm>({
    attendeeCount: Math.min(this.data.capacity, this.data.room.capacity),
    services: this.data.room.services.map((service) => ({
      serviceId: service.serviceId,
      selected: false,
    })),
  });

  protected readonly bookingForm = form(
    this.model,
    (path) => {
      required(path.attendeeCount, { message: 'How many people are coming?' });
      min(path.attendeeCount, 1, { message: 'At least 1 person.' });
      max(path.attendeeCount, this.data.room.capacity, {
        message: `The room holds at most ${this.data.room.capacity} people.`,
      });
    },
    { submission: { action: (field) => this.submit(field().value()) } },
  );

  protected readonly $selectedServices = computed(() => {
    const selected = new Set(
      this.model()
        .services.filter((service) => service.selected)
        .map((service) => service.serviceId),
    );

    return this.data.room.services.filter((service) => selected.has(service.serviceId));
  });

  protected readonly $total = computed(
    () =>
      this.data.room.rentalPrice +
      this.$selectedServices().reduce((sum, service) => sum + service.price, 0),
  );

  protected readonly $formErrors = computed(() => {
    const submitError = this.$submitError();
    const errors = this.bookingForm().errors().map(validationMessage);

    return submitError ? [submitError, ...errors] : errors;
  });

  /** Closes the dialog, handing the booking back if one was made. */
  close(): void {
    const booking = this.$booking();
    this.dialogRef.close(booking ? { booking } : undefined);
  }

  private async submit(value: TBookingForm): Promise<TreeValidationResult> {
    this.$submitError.set(null);

    try {
      this.$booking.set(
        await this.bookRoom.book(
          this.data,
          value.attendeeCount,
          this.$selectedServices().map((service) => service.serviceId),
        ),
      );

      return undefined;
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.status === 400 && apiError.fieldErrors['attendeeCount']) {
        return toFormErrors(apiError, { attendeeCount: this.bookingForm.attendeeCount });
      }

      if (apiError.status === 409 || apiError.status === 404) {
        this.data.refreshResults();
        this.$submitError.set(apiError.status === 409 ? MESSAGES.slotTaken : MESSAGES.roomGone);
      } else if (apiError.status === 400 && apiError.fieldErrors['serviceIds']) {
        this.data.refreshResults();
        this.$submitError.set(MESSAGES.servicesChanged);
      } else if (apiError.status === 0 || apiError.status >= 500) {
        this.$submitError.set(MESSAGES.unreachable);
      } else {
        this.$submitError.set(apiError.detail ?? apiError.title);
      }

      return undefined;
    }
  }
}

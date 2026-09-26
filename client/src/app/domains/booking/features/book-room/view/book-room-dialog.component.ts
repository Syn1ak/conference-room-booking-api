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
import { minutesOfDay } from '../../../../../core/utils/venue-time.util';
import { toApiError, toFormErrors } from '../../../../../core/utils/api-error.util';
import { AlertComponent } from '../../../../../shared/ui/components/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/components/button/button.component';
import { DialogShellComponent } from '../../../../../shared/ui/components/dialog-shell/dialog-shell.component';
import { FormFieldComponent } from '../../../../../shared/ui/components/form-field/form-field.component';
import { CheckboxDirective } from '../../../../../shared/ui/directives/checkbox.directive';
import { InputDirective } from '../../../../../shared/ui/directives/input.directive';
import { DurationPipe } from '../../../../../shared/ui/pipes/duration.pipe';
import { UahPipe } from '../../../../../shared/ui/pipes/uah.pipe';
import { WallDatePipe } from '../../../../../shared/ui/pipes/wall-date.pipe';
import { validationMessage } from '../../../../../shared/ui/utils/validation-message.util';
import { BookRoomService } from '../data-access/book-room.service';
import { TBookRoomData, TBookRoomResult } from '../models/book-room.types';

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
    AlertComponent,
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
  protected readonly data = inject<TBookRoomData>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<TBookRoomResult>>(DialogRef);
  private readonly bookRoom = inject(BookRoomService);

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

  protected readonly $formErrors = computed(() =>
    this.bookingForm().errors().map(validationMessage),
  );

  private async submit(value: TBookingForm): Promise<TreeValidationResult> {
    try {
      const booking = await this.bookRoom.book(
        this.data,
        value.attendeeCount,
        this.$selectedServices().map((service) => service.serviceId),
      );
      this.dialogRef.close({ booking });

      return undefined;
    } catch (error) {
      return toFormErrors(toApiError(error), { attendeeCount: this.bookingForm.attendeeCount });
    }
  }
}

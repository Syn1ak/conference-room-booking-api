import { HttpContext } from '@angular/common/http';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import {
  applyEach,
  disabled,
  form,
  FormField,
  FormRoot,
  maxLength,
  min,
  required,
  TreeValidationResult,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { ArrowLeft, SearchX } from 'lucide';
import { firstValueFrom } from 'rxjs';
import { SKIP_ERROR_TOAST } from '../../../../core/interceptors/error.interceptor';
import { RoomsClient } from '../../../../core/services/api/rooms/rooms.client';
import { ServicesClient } from '../../../../core/services/api/services/services.client';
import { ToastService } from '../../../../core/services/toast/toast.service';
import { toApiError, toFormErrors } from '../../../../core/utils/api-error.util';
import { AlertComponent } from '../../../../shared/ui/components/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { EmptyStateComponent } from '../../../../shared/ui/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/components/error-state/error-state.component';
import { FormFieldComponent } from '../../../../shared/ui/components/form-field/form-field.component';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { CheckboxDirective } from '../../../../shared/ui/directives/checkbox.directive';
import { InputDirective } from '../../../../shared/ui/directives/input.directive';
import { UahPipe } from '../../../../shared/ui/pipes/uah.pipe';
import { validationMessage } from '../../../../shared/ui/utils/validation-message.util';
import { NAME_MAX_LENGTH } from '../../constants/catalog-limits.constant';
import { THasUnsavedChanges } from '../../data-access/guards/unsaved-changes.guard';
import { priceProblem } from '../../utils/price-rules.util';
import { TRoomForm } from './models/room-form.types';
import { hasPrice, toRoomForm, toRoomRequest } from './utils/room-form.util';

/** The page explains every failure itself. */
const INLINE_ERRORS = new HttpContext().set(SKIP_ERROR_TOAST, true);

/**
 * Adds a room, or edits one: its name, size, base rate, and which catalog services it offers at what price. An edit
 * sends the room's complete new state (ADR 0006); existing bookings keep the prices they were made with.
 */
@Component({
  selector: 'app-room-editor',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    AlertComponent,
    ButtonComponent,
    CardComponent,
    CheckboxDirective,
    EmptyStateComponent,
    ErrorStateComponent,
    FormFieldComponent,
    IconComponent,
    InputDirective,
    SkeletonComponent,
    UahPipe,
  ],
  templateUrl: './room-editor.component.html',
})
export default class RoomEditorComponent implements THasUnsavedChanges {
  protected readonly icons = { ArrowLeft, SearchX };
  private readonly roomsClient = inject(RoomsClient);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  /** The room's id from the route, or nothing when adding a room. */
  readonly $id = input<string | undefined>(undefined, { alias: 'id' });

  private readonly room = this.roomsClient.roomResource(computed(() => this.$id() ?? null));
  private readonly catalog = inject(ServicesClient).servicesResource();
  private saved = false;

  protected readonly $isEdit = computed(() => !!this.$id());
  /** The room's saved name, which the heading keeps while the name field is being edited. */
  protected readonly $savedName = computed(() =>
    this.room.hasValue() ? this.room.value().name : '',
  );
  protected readonly $isLoading = computed(
    () => this.catalog.status() === 'loading' || this.room.status() === 'loading',
  );
  protected readonly $isNotFound = computed(
    () => this.room.status() === 'error' && toApiError(this.room.error()).status === 404,
  );
  protected readonly $hasError = computed(
    () =>
      this.catalog.status() === 'error' || (this.room.status() === 'error' && !this.$isNotFound()),
  );

  protected readonly model = linkedSignal<TRoomForm>(() =>
    toRoomForm(
      this.room.hasValue() ? this.room.value() : null,
      this.catalog.hasValue() ? this.catalog.value() : [],
    ),
  );

  protected readonly roomForm = form(
    this.model,
    (path) => {
      required(path.name, { message: 'Enter a name.' });
      maxLength(path.name, NAME_MAX_LENGTH, {
        message: `A name can be at most ${NAME_MAX_LENGTH} characters.`,
      });
      required(path.capacity, { message: 'How many people does it hold?' });
      min(path.capacity, 1, { message: 'A room holds at least 1 person.' });
      validate(path.capacity, ({ value }) =>
        Number.isInteger(value())
          ? undefined
          : { kind: 'integer', message: 'Enter a whole number of people.' },
      );
      validate(path.hourlyPrice, ({ value }) => {
        const message = priceProblem(value());
        return message ? { kind: 'price', message } : undefined;
      });
      applyEach(path.services, (service) => {
        disabled(service.price, ({ valueOf }) => !valueOf(service.offered));
        validate(service.price, ({ value }) => {
          const message = hasPrice(value()) ? priceProblem(value()) : undefined;
          return message ? { kind: 'price', message } : undefined;
        });
      });
    },
    { submission: { action: (field) => this.submit(field().value()) } },
  );

  /** Why the last save failed, when it isn't about a field; kept out of the form so it doesn't block retrying. */
  protected readonly $submitError = signal<string | null>(null);

  protected readonly $formErrors = computed(() => {
    const submitError = this.$submitError();
    const errors = this.roomForm().errors().map(validationMessage);

    return submitError ? [submitError, ...errors] : errors;
  });

  hasUnsavedChanges(): boolean {
    return !this.saved && this.roomForm().dirty();
  }

  protected retry(): void {
    this.catalog.reload();
    this.room.reload();
  }

  private async submit(value: TRoomForm): Promise<TreeValidationResult> {
    this.$submitError.set(null);
    const id = this.$id();
    const request = toRoomRequest(value);

    try {
      const room = await firstValueFrom(
        id
          ? this.roomsClient.update$(id, request, INLINE_ERRORS)
          : this.roomsClient.create$(request, INLINE_ERRORS),
      );
      this.saved = true;
      this.toasts.success(
        id ? `${room.name} saved` : `${room.name} added`,
        'Clients can book it right away.',
      );
      await this.router.navigate(['/admin/rooms']);

      return undefined;
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.status === 409) {
        return {
          kind: 'server',
          message: 'A room with this name already exists.',
          fieldTree: this.roomForm.name,
        };
      }

      if (apiError.status === 404) {
        this.$submitError.set('This room no longer exists; someone may have deleted it.');
      } else if (apiError.status === 400 && apiError.fieldErrors['services']) {
        // A service was deleted from the catalog meanwhile: show the current catalog.
        this.catalog.reload();
        this.$submitError.set(
          'The service catalog has changed since this page opened. Check the services and save again.',
        );
      } else if (apiError.status === 0 || apiError.status >= 500) {
        this.$submitError.set(
          "We couldn't reach the server. Your changes are kept, so you can try again.",
        );
      } else {
        return toFormErrors(apiError, {
          name: this.roomForm.name,
          capacity: this.roomForm.capacity,
          hourlyPrice: this.roomForm.hourlyPrice,
        });
      }

      return undefined;
    }
  }
}

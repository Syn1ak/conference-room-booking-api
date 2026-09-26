import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpContext } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  required,
  TreeValidationResult,
  validate,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { IService } from '../../../../../core/entities/services/service.dto';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/error.interceptor';
import { ServicesClient } from '../../../../../core/services/api/services/services.client';
import { toApiError, toFormErrors } from '../../../../../core/utils/api-error.util';
import { AlertComponent } from '../../../../../shared/ui/components/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/components/button/button.component';
import { DialogShellComponent } from '../../../../../shared/ui/components/dialog-shell/dialog-shell.component';
import { FormFieldComponent } from '../../../../../shared/ui/components/form-field/form-field.component';
import { InputDirective } from '../../../../../shared/ui/directives/input.directive';
import { validationMessage } from '../../../../../shared/ui/utils/validation-message.util';
import { NAME_MAX_LENGTH } from '../../../constants/catalog-limits.constant';
import { priceProblem } from '../../../utils/price-rules.util';

export type TServiceFormData = { service: IService | null };

/** The dialog explains every failure itself. */
const INLINE_ERRORS = new HttpContext().set(SKIP_ERROR_TOAST, true);

/**
 * Adds a service to the catalog, or changes an existing one's name or standard price. Closes with the saved service.
 */
@Component({
  selector: 'app-service-form-dialog',
  imports: [
    FormField,
    FormRoot,
    AlertComponent,
    ButtonComponent,
    DialogShellComponent,
    FormFieldComponent,
    InputDirective,
  ],
  template: `
    <app-dialog-shell
      [title]="data.service ? 'Edit ' + data.service.name : 'Add a service'"
      [description]="
        data.service
          ? 'Rooms that already offer it keep the price they charge.'
          : 'Rooms offer it only once you add it to them.'
      "
      (dismiss)="dialogRef.close()"
    >
      <form id="service-form" class="flex flex-col gap-5" [formRoot]="serviceForm">
        @if ($formErrors().length > 0) {
          <app-alert tone="danger">
            @for (message of $formErrors(); track message) {
              <p>{{ message }}</p>
            }
          </app-alert>
        }
        <app-form-field label="Name" [field]="serviceForm.name">
          <input
            appInput
            cdkFocusInitial
            [formField]="serviceForm.name"
            placeholder="e.g. Coffee break"
          />
        </app-form-field>
        <app-form-field
          label="Standard price, UAH"
          hint="What rooms charge per booking unless they set their own."
          [field]="serviceForm.standardPrice"
        >
          <input
            appInput
            type="number"
            step="0.01"
            inputmode="decimal"
            class="max-w-48"
            [formField]="serviceForm.standardPrice"
          />
        </app-form-field>
      </form>
      <ng-container appDialogActions>
        <button app-button variant="secondary" type="button" (click)="dialogRef.close()">
          Cancel
        </button>
        <button app-button type="submit" form="service-form" [loading]="serviceForm().submitting()">
          {{ data.service ? 'Save changes' : 'Add service' }}
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
})
export class ServiceFormDialogComponent {
  protected readonly data = inject<TServiceFormData>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<IService>>(DialogRef);
  private readonly services = inject(ServicesClient);

  protected readonly model = signal({
    name: this.data.service?.name ?? '',
    standardPrice: this.data.service?.standardPrice ?? 0,
  });

  protected readonly serviceForm = form(
    this.model,
    (path) => {
      required(path.name, { message: 'Enter a name.' });
      maxLength(path.name, NAME_MAX_LENGTH, {
        message: `A name can be at most ${NAME_MAX_LENGTH} characters.`,
      });
      validate(path.standardPrice, ({ value }) => {
        const message = priceProblem(value());

        return message ? { kind: 'price', message } : undefined;
      });
    },
    { submission: { action: (field) => this.submit(field().value()) } },
  );

  /** Why the last attempt failed, when it isn't about a field; kept out of the form so it doesn't block retrying. */
  protected readonly $submitError = signal<string | null>(null);

  protected readonly $formErrors = computed(() => {
    const submitError = this.$submitError();
    const errors = this.serviceForm().errors().map(validationMessage);

    return submitError ? [submitError, ...errors] : errors;
  });

  private async submit(value: {
    name: string;
    standardPrice: number;
  }): Promise<TreeValidationResult> {
    this.$submitError.set(null);
    const request = { name: value.name.trim(), standardPrice: value.standardPrice };

    try {
      const saved = await firstValueFrom(
        this.data.service
          ? this.services.update$(this.data.service.id, request, INLINE_ERRORS)
          : this.services.create$(request, INLINE_ERRORS),
      );
      this.dialogRef.close(saved);

      return undefined;
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.status === 409) {
        return {
          kind: 'server',
          message: 'A service with this name already exists.',
          fieldTree: this.serviceForm.name,
        };
      }

      if (apiError.status === 404) {
        this.$submitError.set(
          'This service no longer exists; someone may have deleted it. Close this to see the current list.',
        );
      } else if (apiError.status === 0 || apiError.status >= 500) {
        this.$submitError.set(
          "We couldn't reach the server. Your changes are kept, so you can try again.",
        );
      } else {
        return toFormErrors(apiError, {
          name: this.serviceForm.name,
          standardPrice: this.serviceForm.standardPrice,
        });
      }

      return undefined;
    }
  }
}

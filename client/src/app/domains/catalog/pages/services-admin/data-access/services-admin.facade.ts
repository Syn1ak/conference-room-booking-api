import { HttpContext } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IService } from '../../../../../core/entities/services/service.dto';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/error.interceptor';
import { ServicesClient } from '../../../../../core/services/api/services/services.client';
import { ToastService } from '../../../../../core/services/toast/toast.service';
import { toApiError } from '../../../../../core/utils/api-error.util';
import { ConfirmDialogService } from '../../../../../shared/features/confirm-dialog/data-access/confirm-dialog.service';

/**
 * The services admin page's data: the catalog of services. Provided by the page.
 */
@Injectable()
export class ServicesAdminFacade {
  private readonly servicesClient = inject(ServicesClient);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toasts = inject(ToastService);
  private readonly services = this.servicesClient.servicesResource();

  readonly $services = computed(() => (this.services.hasValue() ? this.services.value() : []));
  readonly $isLoading = computed(() => this.services.status() === 'loading');
  readonly $hasError = computed(() => this.services.status() === 'error');

  reload(): void {
    this.services.reload();
  }

  /** Deletes a service after asking, and reloads the list however it went. */
  async delete(service: IService): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: `Delete ${service.name}?`,
      message:
        "It's removed from the catalog for good. A service that rooms offer or bookings include can't be deleted.",
      confirmLabel: 'Delete service',
      cancelLabel: 'Keep it',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      await firstValueFrom(
        this.servicesClient.delete$(service.id, new HttpContext().set(SKIP_ERROR_TOAST, true)),
      );
      this.toasts.success(`${service.name} deleted`);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 404) {
        this.toasts.info(`${service.name} was already deleted`);
      } else if (apiError.status === 409) {
        this.toasts.error(`Can't delete ${service.name}`, apiError.title);
      } else {
        this.toasts.error(
          `Can't delete ${service.name}`,
          "We couldn't reach the server. Try again in a moment.",
        );
      }
    }

    this.reload();
  }
}

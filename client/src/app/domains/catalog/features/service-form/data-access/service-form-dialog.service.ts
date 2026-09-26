import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IService } from '../../../../../core/entities/services/service.dto';
import { DialogService } from '../../../../../core/services/dialog/dialog.service';
import {
  ServiceFormDialogComponent,
  TServiceFormData,
} from '../view/service-form-dialog.component';

/**
 * Opens the form to add a service, or to edit one, and resolves with the saved service, or nothing if closed.
 */
@Injectable({ providedIn: 'root' })
export class ServiceFormDialogService {
  private readonly dialogs = inject(DialogService);

  open(service: IService | null = null): Promise<IService | undefined> {
    return firstValueFrom(
      this.dialogs.open<IService, TServiceFormData>(ServiceFormDialogComponent, {
        label: service ? `Edit ${service.name}` : 'Add a service',
        data: { service },
        size: 'sm',
      }).closed,
    );
  }
}

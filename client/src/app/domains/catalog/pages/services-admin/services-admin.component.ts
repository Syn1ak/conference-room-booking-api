import { Component, inject } from '@angular/core';
import { IService } from '../../../../core/entities/services/service.dto';
import { ToastService } from '../../../../core/services/toast/toast.service';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { Package, Pencil, Plus } from 'lucide';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { EmptyStateComponent } from '../../../../shared/ui/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/ui/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { UahPipe } from '../../../../shared/ui/pipes/uah.pipe';
import { ServiceFormDialogService } from '../../features/service-form/data-access/service-form-dialog.service';
import { ServicesAdminFacade } from './data-access/services-admin.facade';

/**
 * The catalog of services, such as a projector or Wi-Fi, that rooms can offer. For staff.
 */
@Component({
  selector: 'app-services-admin',
  imports: [
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
    UahPipe,
  ],
  providers: [ServicesAdminFacade],
  templateUrl: './services-admin.component.html',
})
export default class ServicesAdminComponent {
  protected readonly icons = { Package, Pencil, Plus };
  protected readonly facade = inject(ServicesAdminFacade);
  private readonly serviceForm = inject(ServiceFormDialogService);
  private readonly toasts = inject(ToastService);

  protected async add(): Promise<void> {
    const saved = await this.serviceForm.open();
    if (saved) {
      this.toasts.success(`${saved.name} added`, 'Add it to rooms to offer it.');
    }
    this.facade.reload();
  }

  protected async edit(service: IService): Promise<void> {
    const saved = await this.serviceForm.open(service);
    if (saved) {
      this.toasts.success(`${saved.name} saved`);
    }
    this.facade.reload();
  }
}

import { Component, inject } from '@angular/core';
import { Package } from 'lucide';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { EmptyStateComponent } from '../../../../shared/ui/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/ui/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { UahPipe } from '../../../../shared/ui/pipes/uah.pipe';
import { ServicesAdminFacade } from './data-access/services-admin.facade';

/**
 * The catalog of services, such as a projector or Wi-Fi, that rooms can offer. For staff.
 */
@Component({
  selector: 'app-services-admin',
  imports: [
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
  protected readonly icons = { Package };
  protected readonly facade = inject(ServicesAdminFacade);
}

import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DoorClosed, Pencil, Plus, Trash2 } from 'lucide';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { EmptyStateComponent } from '../../../../shared/ui/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/ui/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/ui/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/ui/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { UahPipe } from '../../../../shared/ui/pipes/uah.pipe';
import { RoomsAdminFacade } from './data-access/rooms-admin.facade';

/**
 * The rooms, for staff to manage.
 */
@Component({
  selector: 'app-rooms-admin',
  imports: [
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
    UahPipe,
  ],
  providers: [RoomsAdminFacade],
  templateUrl: './rooms-admin.component.html',
})
export default class RoomsAdminComponent {
  protected readonly icons = { DoorClosed, Pencil, Plus, Trash2 };
  protected readonly facade = inject(RoomsAdminFacade);
}

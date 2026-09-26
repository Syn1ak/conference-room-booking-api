import { Route } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const ROUTES: Route[] = [
  {
    path: 'rooms',
    title: 'Rooms',
    loadComponent: () => import('./pages/room-list/room-list.component'),
  },
  {
    path: 'admin/services',
    title: 'Services',
    canActivate: [roleGuard('Admin')],
    loadComponent: () => import('./pages/services-admin/services-admin.component'),
  },
];

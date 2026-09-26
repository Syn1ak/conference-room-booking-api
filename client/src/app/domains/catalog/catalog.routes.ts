import { Route } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { unsavedChangesGuard } from './data-access/guards/unsaved-changes.guard';

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
  {
    path: 'admin/rooms',
    title: 'Manage rooms',
    canActivate: [roleGuard('Admin')],
    loadComponent: () => import('./pages/rooms-admin/rooms-admin.component'),
  },
  {
    path: 'admin/rooms/new',
    title: 'Add a room',
    canActivate: [roleGuard('Admin')],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./pages/room-editor/room-editor.component'),
  },
  {
    path: 'admin/rooms/:id/edit',
    title: 'Edit room',
    canActivate: [roleGuard('Admin')],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./pages/room-editor/room-editor.component'),
  },
];

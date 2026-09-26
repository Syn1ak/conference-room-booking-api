import { Route } from '@angular/router';

export const ROUTES: Route[] = [
  {
    path: 'rooms',
    title: 'Rooms',
    loadComponent: () => import('./pages/room-list/room-list.component'),
  },
];

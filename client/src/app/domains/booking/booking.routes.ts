import { Route } from '@angular/router';

export const ROUTES: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Find a room',
    loadComponent: () => import('./pages/find-room/find-room.component'),
  },
];

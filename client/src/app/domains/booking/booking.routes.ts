import { Route } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const ROUTES: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Find a room',
    loadComponent: () => import('./pages/find-room/find-room.component'),
  },
  {
    path: 'bookings',
    title: 'Bookings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/booking-list/booking-list.component'),
  },
  {
    path: 'bookings/:id',
    title: 'Booking',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/booking-details/booking-details.component'),
  },
];

import { Route } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';

export const ROUTES: Route[] = [
  {
    path: 'login',
    title: 'Sign in',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.component'),
  },
  {
    path: 'register',
    title: 'Create account',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.component'),
  },
];

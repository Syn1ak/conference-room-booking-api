import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      // First among the empty-path groups: a group whose children all have paths still matches the empty URL, with
      // nothing to show, so the group that owns the home page must be tried before the others.
      {
        path: '',
        loadChildren: () => import('./domains/booking/booking.routes').then((r) => r.ROUTES),
      },
      {
        path: '',
        loadChildren: () => import('./domains/auth/auth.routes').then((r) => r.ROUTES),
      },
      {
        path: '',
        loadChildren: () => import('./domains/catalog/catalog.routes').then((r) => r.ROUTES),
      },
      {
        path: 'no-access',
        title: 'No access',
        loadComponent: () => import('./domains/system/pages/no-access/no-access.component'),
      },
      {
        path: '**',
        title: 'Page not found',
        loadComponent: () => import('./domains/system/pages/not-found/not-found.component'),
      },
    ],
  },
];

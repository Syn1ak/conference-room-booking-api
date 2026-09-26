import { Routes } from '@angular/router';

export const routes: Routes = [
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
];

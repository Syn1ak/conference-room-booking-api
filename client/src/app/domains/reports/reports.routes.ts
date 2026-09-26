import { Route } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const ROUTES: Route[] = [
  {
    path: 'admin/reports',
    title: 'Reports',
    canActivate: [roleGuard('Admin')],
    loadComponent: () => import('./pages/reports/reports.component'),
  },
];

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TRole } from '../entities/auth/auth.dto';
import { SessionStore } from '../services/session/session.store';

/**
 * Lets through users with the given role. Anonymous users are sent to sign in; signed-in users with another role see
 * the "no access" page rather than bouncing between redirects.
 */
export function roleGuard(role: TRole): CanActivateFn {
  return (_route, state) => {
    const session = inject(SessionStore);
    const router = inject(Router);

    if (!session.$isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    return session.$role() === role || router.createUrlTree(['/no-access']);
  };
}

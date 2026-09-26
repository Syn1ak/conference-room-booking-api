import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../services/session/session.store';

/** Lets signed-in users through, and sends everyone else to sign in, coming back here afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);

  return (
    session.$isAuthenticated() ||
    inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })
  );
};

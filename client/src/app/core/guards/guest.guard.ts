import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../services/session/session.store';
import { homeUrl } from '../utils/home-url.util';

/** Keeps signed-in users away from sign-in and registration, sending them to their home page instead. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);

  return !session.$isAuthenticated() || inject(Router).parseUrl(homeUrl(session.$role()));
};

import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { SessionStore } from '../services/session/session.store';
import { testSession } from '../testing/session.testing';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';
import { roleGuard } from './role.guard';

describe('route guards', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  const run = (guard: CanActivateFn, url = '/bookings?page=2') => {
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
  };

  const signIn = (role: 'Admin' | 'Client') =>
    TestBed.inject(SessionStore).start(testSession({ role }));

  describe('authGuard', () => {
    it('lets a signed-in user through', () => {
      signIn('Client');

      expect(run(authGuard)).toBe(true);
    });

    it('sends an anonymous user to sign in and back', () => {
      expect(run(authGuard)).toBe('/login?returnUrl=%2Fbookings%3Fpage%3D2');
    });
  });

  describe('roleGuard', () => {
    it('lets a user with the role through', () => {
      signIn('Admin');

      expect(run(roleGuard('Admin'))).toBe(true);
    });

    it('shows the no-access page to a user with another role', () => {
      signIn('Client');

      expect(run(roleGuard('Admin'))).toBe('/no-access');
    });

    it('sends an anonymous user to sign in', () => {
      expect(run(roleGuard('Client'), '/bookings')).toBe('/login?returnUrl=%2Fbookings');
    });
  });

  describe('guestGuard', () => {
    it('lets an anonymous user through', () => {
      expect(run(guestGuard)).toBe(true);
    });

    it('sends a signed-in user to their home page', () => {
      signIn('Client');
      expect(run(guestGuard)).toBe('/');

      signIn('Admin');
      expect(run(guestGuard)).toBe('/bookings');
    });
  });
});

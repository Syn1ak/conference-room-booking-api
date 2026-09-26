import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { testSession } from '../../testing/session.testing';
import { ToastService } from '../toast/toast.service';
import { SessionStore } from './session.store';

describe('SessionStore', () => {
  const STORAGE_KEY = 'crb.session';

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
  });

  afterEach(() => vi.useRealTimers());

  it('starts signed out', () => {
    const store = TestBed.inject(SessionStore);

    expect(store.$isAuthenticated()).toBe(false);
    expect(store.accessToken).toBeNull();
  });

  it('keeps a started session in sessionStorage and restores it after a reload', () => {
    TestBed.inject(SessionStore).start(testSession({ role: 'Admin' }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const reloaded = TestBed.inject(SessionStore);

    expect(reloaded.$isAuthenticated()).toBe(true);
    expect(reloaded.$role()).toBe('Admin');
    expect(reloaded.accessToken).toBe('test-token');
  });

  it("doesn't restore a session whose token has expired", () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...testSession(), expiresAt: new Date(Date.now() - 1000).toISOString() }),
    );

    const store = TestBed.inject(SessionStore);

    expect(store.$isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it.each([
    ['not JSON', '{oops'],
    ['the wrong shape', JSON.stringify({ accessToken: 42 })],
    [
      'an unknown role',
      JSON.stringify({ ...testSession(), user: { id: '1', email: 'a@b.c', role: 'Root' } }),
    ],
  ])('ignores stored data that is %s', (_, stored) => {
    sessionStorage.setItem(STORAGE_KEY, stored);

    expect(TestBed.inject(SessionStore).$isAuthenticated()).toBe(false);
  });

  it('ends the session on sign-out and forgets it', () => {
    const store = TestBed.inject(SessionStore);
    store.start(testSession());

    store.end();

    expect(store.$isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('expires the session when the token runs out, and sends the user to sign in', async () => {
    vi.useFakeTimers();
    const store = TestBed.inject(SessionStore);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/bookings?page=2');
    const navigate = vi.spyOn(router, 'navigate');
    store.start({ ...testSession(), expiresAt: new Date(Date.now() + 5000).toISOString() });

    vi.advanceTimersByTime(4999);
    expect(store.$isAuthenticated()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(store.$isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/bookings?page=2' },
    });
    expect(
      TestBed.inject(ToastService)
        .$items()
        .map((toast) => toast.title),
    ).toEqual(['Your session has expired']);
  });

  it('expires only once when asked several times', () => {
    const store = TestBed.inject(SessionStore);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    store.start(testSession());

    store.expire();
    store.expire();

    expect(navigate).toHaveBeenCalledOnce();
    expect(TestBed.inject(ToastService).$items()).toHaveLength(1);
  });

  it("doesn't expire a session the user already signed out of", () => {
    vi.useFakeTimers();
    const store = TestBed.inject(SessionStore);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    store.start({ ...testSession(), expiresAt: new Date(Date.now() + 5000).toISOString() });

    store.end();
    vi.advanceTimersByTime(10_000);

    expect(navigate).not.toHaveBeenCalled();
  });
});

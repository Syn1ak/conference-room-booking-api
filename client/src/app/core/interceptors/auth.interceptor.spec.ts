import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../services/session/session.store';
import { ToastService } from '../services/toast/toast.service';
import { testSession } from '../testing/session.testing';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let session: SessionStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
  });

  afterEach(() => backend.verify());

  it('sends the token to the API', () => {
    session.start(testSession());

    void firstValueFrom(http.get('/api/bookings'));

    expect(backend.expectOne('/api/bookings').request.headers.get('Authorization')).toBe(
      'Bearer test-token',
    );
  });

  it('never sends the token to another origin', () => {
    session.start(testSession());

    void firstValueFrom(http.get('https://evil.test/api/bookings'));

    expect(
      backend.expectOne('https://evil.test/api/bookings').request.headers.has('Authorization'),
    ).toBe(false);
  });

  it("doesn't send a token when signed out", () => {
    void firstValueFrom(http.get('/api/rooms'));

    expect(backend.expectOne('/api/rooms').request.headers.has('Authorization')).toBe(false);
  });

  it('keeps an Authorization header the caller set', () => {
    session.start(testSession());

    void firstValueFrom(
      http.get('/api/auth/me', { headers: { Authorization: 'Bearer fresh-token' } }),
    );

    expect(backend.expectOne('/api/auth/me').request.headers.get('Authorization')).toBe(
      'Bearer fresh-token',
    );
  });

  it('ends the session and redirects when the API rejects the token', async () => {
    session.start(testSession());
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    const result = firstValueFrom(http.get('/api/bookings'));
    backend.expectOne('/api/bookings').flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(result).rejects.toBeTruthy();
    expect(session.$isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });

  it('treats a failed login as wrong credentials, not an expired session', async () => {
    session.start(testSession());

    const result = firstValueFrom(http.post('/api/auth/login', {}));
    const request = backend.expectOne('/api/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(
      { title: 'Invalid email or password.' },
      { status: 401, statusText: 'Unauthorized' },
    );

    await expect(result).rejects.toBeTruthy();
    expect(session.$isAuthenticated()).toBe(true);
  });

  it('shows one message and redirects once when two requests fail together', async () => {
    session.start(testSession());
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    const first = firstValueFrom(http.get('/api/bookings'));
    const second = firstValueFrom(http.get('/api/reports/revenue'));
    backend.expectOne('/api/bookings').flush(null, { status: 401, statusText: 'Unauthorized' });
    backend
      .expectOne('/api/reports/revenue')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(first).rejects.toBeTruthy();
    await expect(second).rejects.toBeTruthy();
    expect(navigate).toHaveBeenCalledOnce();
    expect(TestBed.inject(ToastService).$items()).toHaveLength(1);
  });

  it("doesn't end the session on a 403", async () => {
    session.start(testSession());

    const result = firstValueFrom(http.get('/api/reports/revenue'));
    backend.expectOne('/api/reports/revenue').flush(null, { status: 403, statusText: 'Forbidden' });

    await expect(result).rejects.toBeTruthy();
    expect(session.$isAuthenticated()).toBe(true);
  });
});

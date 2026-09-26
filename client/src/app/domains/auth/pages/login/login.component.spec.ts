import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SessionStore } from '../../../../core/services/session/session.store';
import LoginComponent from './login.component';

describe('LoginComponent', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.useRealTimers());

  const setup = async (returnUrl: string | null = null) => {
    const result = await render(LoginComponent, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      componentInputs: { returnUrl },
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    return { ...result, navigate, http: TestBed.inject(HttpTestingController) };
  };

  const fillIn = async (email = 'ann@example.test', password = 'Secret-Pass1!') => {
    await userEvent.type(screen.getByLabelText(/Email/), email);
    await userEvent.type(screen.getByLabelText(/Password/), password);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  };

  const answerLogin = async (http: HttpTestingController, roles = ['Client']) => {
    http.expectOne('/api/auth/login').flush({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    // The account is only asked for once the login has answered.
    await new Promise((resolve) => setTimeout(resolve));
    http.expectOne('/api/auth/me').flush({ userId: 'u1', email: 'ann@example.test', roles });
  };

  it('asks for both fields without calling the server', async () => {
    const { http } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    http.expectNone('/api/auth/login');
  });

  it('signs in and returns to the page the user came from', async () => {
    const { http, navigate, fixture } = await setup('/bookings?page=2');

    await fillIn();
    await answerLogin(http);
    await fixture.whenStable();

    expect(TestBed.inject(SessionStore).$user()).toEqual({
      id: 'u1',
      email: 'ann@example.test',
      role: 'Client',
    });
    expect(navigate).toHaveBeenCalledWith('/bookings?page=2');
  });

  it.each(['https://evil.test', '//evil.test', '/\\evil.test'])(
    "ignores a return address on another site (%s) and goes to the user's home page",
    async (returnUrl) => {
      const { http, navigate, fixture } = await setup(returnUrl);

      await fillIn();
      await answerLogin(http, ['Admin']);
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith('/bookings');
    },
  );

  it('says the credentials are invalid without saying which one', async () => {
    const { http } = await setup();

    await fillIn();
    http
      .expectOne('/api/auth/login')
      .flush({ title: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(TestBed.inject(SessionStore).$isAuthenticated()).toBe(false);
  });

  it('waits out the rate limit before allowing another attempt', async () => {
    const { http, fixture } = await setup();

    await fillIn();
    // Only the countdown's interval is faked; Angular keeps its real timers.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    http
      .expectOne('/api/auth/login')
      .flush(
        { title: 'Too many requests.' },
        { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '30' } },
      );

    const button = await screen.findByRole('button', { name: 'Try again in 30 s' });
    expect(button).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Too many sign-in attempts.');

    vi.advanceTimersByTime(1000);
    await fixture.whenStable();
    expect(screen.getByRole('button', { name: 'Try again in 29 s' })).toBeDisabled();

    vi.advanceTimersByTime(29_000);
    await fixture.whenStable();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it("says when the server can't be reached", async () => {
    const { http } = await setup();

    await fillIn();
    http.expectOne('/api/auth/login').error(new ProgressEvent('error'));

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't reach the server.");
  });

  it('can try again right away after the server was unreachable, without editing anything', async () => {
    const { http } = await setup();

    await fillIn();
    http.expectOne('/api/auth/login').error(new ProgressEvent('error'));
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    http.expectOne('/api/auth/login');
  });

  it('can sign in once the rate limit has passed, without editing anything', async () => {
    const { http, fixture } = await setup();

    await fillIn();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    http.expectOne('/api/auth/login').flush(null, {
      status: 429,
      statusText: 'Too Many Requests',
      headers: { 'Retry-After': '2' },
    });
    await screen.findByRole('button', { name: 'Try again in 2 s' });
    vi.advanceTimersByTime(2000);
    await fixture.whenStable();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    http.expectOne('/api/auth/login');
  });

  it('links to registration, keeping the return address', async () => {
    await setup('/bookings');

    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register?returnUrl=%2Fbookings',
    );
  });
});

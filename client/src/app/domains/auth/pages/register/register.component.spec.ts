import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SessionStore } from '../../../../core/services/session/session.store';
import RegisterComponent from './register.component';

describe('RegisterComponent', () => {
  beforeEach(() => sessionStorage.clear());

  const setup = async (returnUrl: string | null = null) => {
    const result = await render(RegisterComponent, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      componentInputs: { returnUrl },
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    return { ...result, navigate, http: TestBed.inject(HttpTestingController) };
  };

  const fillIn = async (password = 'Strong-Pass1!', confirmPassword = password) => {
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.test');
    await userEvent.type(screen.getByLabelText('Password'), password);
    await userEvent.type(screen.getByLabelText('Repeat password'), confirmPassword);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
  };

  it('ticks off each password requirement as it is met', async () => {
    await setup();
    const requirements = screen.getByRole('list', { name: 'Password requirements' });

    await userEvent.type(screen.getByLabelText('Password'), 'abcdefgh');

    expect(within(requirements).getByText(/At least 8 characters/)).toHaveTextContent('(done)');
    expect(within(requirements).getByText(/A lowercase letter/)).toHaveTextContent('(done)');
    expect(within(requirements).getByText(/An uppercase letter/)).toHaveTextContent('(not yet)');
    expect(within(requirements).getByText(/A symbol/)).toHaveTextContent('(not yet)');
  });

  it("refuses a password that doesn't meet the policy, without calling the server", async () => {
    const { http } = await setup();

    await fillIn('weakpassword');

    expect(
      await screen.findByText("The password doesn't meet all the requirements."),
    ).toBeInTheDocument();
    http.expectNone('/api/auth/register');
  });

  it("refuses passwords that don't match", async () => {
    const { http } = await setup();

    await fillIn('Strong-Pass1!', 'Strong-Pass2!');

    expect(await screen.findByText("The passwords don't match.")).toBeInTheDocument();
    http.expectNone('/api/auth/register');
  });

  it('registers, signs in, and goes to the page the user came from', async () => {
    const { http, navigate, fixture } = await setup('/?capacity=10');

    await fillIn();
    const registration = http.expectOne('/api/auth/register');
    expect(registration.request.body).toEqual({
      email: 'new@example.test',
      password: 'Strong-Pass1!',
    });
    registration.flush(
      { userId: 'u1', email: 'new@example.test' },
      { status: 201, statusText: 'Created' },
    );
    await new Promise((resolve) => setTimeout(resolve));
    http.expectOne('/api/auth/login').flush({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    await new Promise((resolve) => setTimeout(resolve));
    http
      .expectOne('/api/auth/me')
      .flush({ userId: 'u1', email: 'new@example.test', roles: ['Client'] });
    await fixture.whenStable();

    expect(TestBed.inject(SessionStore).$role()).toBe('Client');
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/?capacity=10'));
  });

  it('can try again right away after the server was unreachable, without editing anything', async () => {
    const { http } = await setup();

    await fillIn();
    http.expectOne('/api/auth/register').error(new ProgressEvent('error'));
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't reach the server.");
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    http.expectOne('/api/auth/register');
  });

  it('shows a taken email next to the email field', async () => {
    const { http } = await setup();

    await fillIn();
    http.expectOne('/api/auth/register').flush(
      {
        title: 'One or more validation errors occurred.',
        errors: { Email: ['An account with this email already exists.'] },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(
      await screen.findByText('An account with this email already exists.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the password errors the server returns next to the password field', async () => {
    const { http } = await setup();

    await fillIn();
    http
      .expectOne('/api/auth/register')
      .flush(
        { errors: { Password: ['Passwords must have at least one digit.'] } },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(await screen.findByText('Passwords must have at least one digit.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
  });
});

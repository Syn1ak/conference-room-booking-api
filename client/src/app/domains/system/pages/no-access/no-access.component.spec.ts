import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SessionStore } from '../../../../core/services/session/session.store';
import { testSession } from '../../../../core/testing/session.testing';
import NoAccessComponent from './no-access.component';

describe('NoAccessComponent', () => {
  beforeEach(() => sessionStorage.clear());

  it('says who is signed in and whom the page is for', async () => {
    await render(NoAccessComponent, {
      providers: [provideRouter([])],
      configureTestBed: () =>
        TestBed.inject(SessionStore).start(testSession({ email: 'ann@example.test' })),
    });

    expect(screen.getByText(/ann@example.test/)).toBeInTheDocument();
    expect(screen.getByText(/This page is for staff only/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to my home page' })).toHaveAttribute('href', '/');
  });

  it('signs out to let the user sign in with another account', async () => {
    await render(NoAccessComponent, {
      providers: [provideRouter([])],
      configureTestBed: () => TestBed.inject(SessionStore).start(testSession()),
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    await userEvent.click(screen.getByRole('button', { name: 'Sign in with another account' }));

    expect(TestBed.inject(SessionStore).$isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});

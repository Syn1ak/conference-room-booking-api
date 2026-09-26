import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SessionStore } from '../../../../core/services/session/session.store';
import { testSession } from '../../../../core/testing/session.testing';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  beforeEach(() => sessionStorage.clear());

  const setup = (role?: 'Admin' | 'Client') =>
    render(HeaderComponent, {
      providers: [provideRouter([])],
      configureTestBed: () => {
        if (role) {
          TestBed.inject(SessionStore).start(
            testSession({ role, email: `${role.toLowerCase()}@example.test` }),
          );
        }
      },
    });

  const mainLinks = () =>
    within(screen.getAllByRole('navigation', { name: 'Main' })[0])
      .getAllByRole('link')
      .map((link) => link.textContent?.trim());

  it('shows visitors how to find rooms and sign in', async () => {
    await setup();

    expect(mainLinks()).toEqual(['Find a room', 'Rooms']);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('adds their bookings for clients', async () => {
    await setup('Client');

    expect(mainLinks()).toEqual(['Find a room', 'Rooms', 'My bookings']);
    expect(
      screen.getByRole('button', { name: 'Account: client@example.test' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
  });

  it('shows staff the management pages', async () => {
    await setup('Admin');

    expect(mainLinks()).toEqual(['Bookings', 'Rooms', 'Services', 'Reports']);
  });

  it('opens and closes the navigation panel on small screens', async () => {
    await setup();
    const toggle = screen.getByRole('button', { name: 'Open menu' });

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }));

    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1);
  });
});

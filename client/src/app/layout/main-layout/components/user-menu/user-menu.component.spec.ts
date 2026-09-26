import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SessionStore } from '../../../../core/services/session/session.store';
import { ToastService } from '../../../../core/services/toast/toast.service';
import { testSession } from '../../../../core/testing/session.testing';
import { UserMenuComponent } from './user-menu.component';

describe('UserMenuComponent', () => {
  beforeEach(() => sessionStorage.clear());

  const setup = (role: 'Admin' | 'Client') =>
    render(UserMenuComponent, {
      providers: [provideRouter([])],
      configureTestBed: () =>
        TestBed.inject(SessionStore).start(testSession({ role, email: 'ann@example.test' })),
    });

  it('shows the account and its role in the menu', async () => {
    await setup('Client');

    await userEvent.click(screen.getByRole('button', { name: 'Account: ann@example.test' }));

    expect(await screen.findByRole('menu')).toHaveTextContent('ann@example.test');
    expect(screen.getByRole('menu')).toHaveTextContent('Client');
    expect(screen.getByRole('menuitem', { name: 'My bookings' })).toBeInTheDocument();
  });

  it("doesn't offer bookings to staff, who can't book", async () => {
    await setup('Admin');

    await userEvent.click(screen.getByRole('button', { name: 'Account: ann@example.test' }));

    expect(await screen.findByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'My bookings' })).toBeNull();
  });

  it('signs out and goes home', async () => {
    await setup('Client');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    await userEvent.click(screen.getByRole('button', { name: 'Account: ann@example.test' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    expect(TestBed.inject(SessionStore).$isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(
      TestBed.inject(ToastService)
        .$items()
        .map((toast) => toast.title),
    ).toEqual(['Signed out']);
  });
});

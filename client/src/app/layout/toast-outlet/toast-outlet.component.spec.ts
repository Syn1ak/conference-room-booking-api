import { TestBed } from '@angular/core/testing';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ToastService } from '../../core/services/toast/toast.service';
import { ToastOutletComponent } from './toast-outlet.component';

describe('ToastOutletComponent', () => {
  it('announces errors assertively and other toasts politely', async () => {
    const { container, fixture } = await render(ToastOutletComponent);
    const toasts = TestBed.inject(ToastService);

    toasts.error("Can't reach the server", 'Check your connection.');
    toasts.success('Booking confirmed');
    await fixture.whenStable();

    const assertive = container.querySelector('[aria-live="assertive"]') as HTMLElement;
    const polite = container.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(within(assertive).getByText("Can't reach the server")).toBeInTheDocument();
    expect(within(assertive).getByText('Check your connection.')).toBeInTheDocument();
    expect(within(polite).getByText('Booking confirmed')).toBeInTheDocument();
  });

  it('removes a toast when its close button is pressed', async () => {
    const { fixture } = await render(ToastOutletComponent);
    TestBed.inject(ToastService).info('Saved');
    await fixture.whenStable();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByText('Saved')).toBeNull();
  });
});

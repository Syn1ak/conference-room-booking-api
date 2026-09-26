import { render, screen } from '@testing-library/angular';
import { AlertComponent } from './alert.component';

describe('AlertComponent', () => {
  it('announces an error right away', async () => {
    await render(`<app-alert tone="danger" title="Booking failed">The slot is taken.</app-alert>`, {
      imports: [AlertComponent],
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Booking failed');
    expect(screen.getByRole('alert')).toHaveTextContent('The slot is taken.');
  });

  it('announces information politely', async () => {
    await render(`<app-alert>Prices include the peak surcharge.</app-alert>`, {
      imports: [AlertComponent],
    });

    expect(screen.getByRole('status')).toHaveTextContent('Prices include the peak surcharge.');
  });
});

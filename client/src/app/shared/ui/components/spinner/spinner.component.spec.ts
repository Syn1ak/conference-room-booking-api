import { render, screen } from '@testing-library/angular';
import { SpinnerComponent } from './spinner.component';

describe('SpinnerComponent', () => {
  it('is announced as a status when it has a label', async () => {
    await render(`<app-spinner label="Loading rooms" />`, { imports: [SpinnerComponent] });

    expect(screen.getByRole('status', { name: 'Loading rooms' })).toBeInTheDocument();
  });

  it('is hidden from assistive technology without a label', async () => {
    const { container } = await render(`<app-spinner />`, { imports: [SpinnerComponent] });

    expect(container.querySelector('app-spinner')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('status')).toBeNull();
  });
});

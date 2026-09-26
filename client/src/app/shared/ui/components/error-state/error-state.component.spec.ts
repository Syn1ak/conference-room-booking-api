import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ErrorStateComponent } from './error-state.component';

describe('ErrorStateComponent', () => {
  it('is announced and asks to try again', async () => {
    const retry = vi.fn();
    await render(`<app-error-state message="The server didn't answer." (retry)="retry()" />`, {
      imports: [ErrorStateComponent],
      componentProperties: { retry },
    });

    expect(screen.getByRole('alert')).toHaveTextContent("The server didn't answer.");

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(retry).toHaveBeenCalledOnce();
  });
});

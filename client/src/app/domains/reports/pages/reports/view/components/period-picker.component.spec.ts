import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { PeriodPickerComponent } from './period-picker.component';

describe('PeriodPickerComponent', () => {
  const setup = async () => {
    const periodChange = vi.fn();
    await render(
      `<app-period-picker [period]="period" today="2026-09-26" (periodChange)="periodChange($event)" />`,
      {
        imports: [PeriodPickerComponent],
        componentProperties: { period: { from: '2026-09-01', to: '2026-09-30' }, periodChange },
      },
    );
    return periodChange;
  };

  it('marks the preset that matches the period', async () => {
    await setup();

    expect(screen.getByRole('button', { name: 'This month' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Last month' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('picks a preset', async () => {
    const periodChange = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Next 30 days' }));

    expect(periodChange).toHaveBeenCalledWith({ from: '2026-09-26', to: '2026-10-25' });
  });

  it('refuses a custom range of 367 days', async () => {
    const periodChange = await setup();

    await userEvent.clear(screen.getByLabelText('From'));
    await userEvent.type(screen.getByLabelText('From'), '2026-01-01');
    await userEvent.clear(screen.getByLabelText('To'));
    await userEvent.type(screen.getByLabelText('To'), '2027-01-02');
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));

    expect(await screen.findByText('A report covers at most 366 days.')).toBeInTheDocument();
    expect(periodChange).not.toHaveBeenCalled();
  });

  it('shows a valid custom range', async () => {
    const periodChange = await setup();

    await userEvent.clear(screen.getByLabelText('To'));
    await userEvent.type(screen.getByLabelText('To'), '2026-12-31');
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));

    expect(periodChange).toHaveBeenCalledWith({ from: '2026-09-01', to: '2026-12-31' });
  });
});

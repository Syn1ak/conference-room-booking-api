import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  it('shows its content and passes clicks through', async () => {
    const save = vi.fn();
    await render(`<button app-button (click)="save()">Save</button>`, {
      imports: [ButtonComponent],
      componentProperties: { save },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(save).toHaveBeenCalledOnce();
  });

  it('is disabled, busy, and ignores clicks while loading', async () => {
    const save = vi.fn();
    await render(`<button app-button loading (click)="save()">Save</button>`, {
      imports: [ButtonComponent],
      componentProperties: { save },
    });

    const button = screen.getByRole('button', { name: 'Save' });
    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(save).not.toHaveBeenCalled();
  });

  it('keeps its content in the layout and its accessible name while loading', async () => {
    await render(`<button app-button loading>Save</button>`, { imports: [ButtonComponent] });

    expect(screen.getByText('Save')).toHaveClass('opacity-0');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('marks a disabled link as disabled without a disabled attribute on the anchor', async () => {
    await render(`<a app-button href="/rooms" disabled>Rooms</a>`, { imports: [ButtonComponent] });

    const link = screen.getByRole('link', { name: 'Rooms' });

    expect(link).toHaveAttribute('aria-disabled', 'true');
  });

  it('applies the variant and size', async () => {
    await render(`<button app-button variant="danger" size="lg">Delete</button>`, {
      imports: [ButtonComponent],
    });

    const button = screen.getByRole('button', { name: 'Delete' });

    expect(button).toHaveClass('bg-red-600', 'h-12');
  });
});

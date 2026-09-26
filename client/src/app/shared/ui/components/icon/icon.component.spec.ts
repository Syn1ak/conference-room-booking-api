import { render, screen } from '@testing-library/angular';
import { Calendar } from 'lucide';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  it("draws the icon's elements", async () => {
    const { container } = await render(`<app-icon [icon]="icon" />`, {
      imports: [IconComponent],
      componentProperties: { icon: Calendar },
    });

    expect(container.querySelectorAll('svg path')).toHaveLength(3);
    expect(container.querySelector('svg rect')).toHaveAttribute('rx', '2');
  });

  it('is hidden from assistive technology without a label', async () => {
    const { container } = await render(`<app-icon [icon]="icon" />`, {
      imports: [IconComponent],
      componentProperties: { icon: Calendar },
    });

    expect(container.querySelector('app-icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('is announced as an image with a label', async () => {
    await render(`<app-icon [icon]="icon" label="Date" />`, {
      imports: [IconComponent],
      componentProperties: { icon: Calendar },
    });

    expect(screen.getByRole('img', { name: 'Date' })).toBeInTheDocument();
  });
});

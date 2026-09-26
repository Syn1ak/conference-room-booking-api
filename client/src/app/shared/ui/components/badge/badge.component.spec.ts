import { render, screen } from '@testing-library/angular';
import { BadgeComponent } from './badge.component';

describe('BadgeComponent', () => {
  it('is neutral by default', async () => {
    await render(`<app-badge>Draft</app-badge>`, { imports: [BadgeComponent] });

    expect(screen.getByText('Draft')).toHaveClass('bg-surface-muted');
  });

  it('uses the colour of its tone', async () => {
    await render(`<app-badge tone="peak">Peak</app-badge>`, { imports: [BadgeComponent] });

    expect(screen.getByText('Peak')).toHaveClass('bg-band-peak/15');
  });
});

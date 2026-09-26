import { render, screen } from '@testing-library/angular';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  it('shows its title, description, and action', async () => {
    await render(
      `<app-empty-state title="No bookings yet" description="Find a room to get started.">
        <a href="/">Find a room</a>
      </app-empty-state>`,
      { imports: [EmptyStateComponent] },
    );

    expect(screen.getByRole('heading', { name: 'No bookings yet' })).toBeInTheDocument();
    expect(screen.getByText('Find a room to get started.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find a room' })).toBeInTheDocument();
  });
});

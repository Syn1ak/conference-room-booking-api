import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { VenueStore } from '../../../../core/services/venue/venue.store';
import { TEST_VENUE } from '../../../../core/testing/venue.testing';
import FindRoomComponent from './find-room.component';

describe('FindRoomComponent', () => {
  beforeEach(() => {
    // 1 October 2026, 09:00 in Kyiv.
    vi.useFakeTimers({ now: new Date('2026-10-01T06:00:00Z'), toFake: ['Date'] });
  });

  afterEach(() => vi.useRealTimers());

  const setup = async (query: Record<string, string> = {}) => {
    const result = await render(FindRoomComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: VenueStore, useValue: { venue: TEST_VENUE } },
      ],
      componentInputs: query,
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    return { ...result, navigate };
  };

  const values = () => ({
    date: (screen.getByLabelText('Date') as HTMLInputElement).value,
    from: (screen.getByLabelText('From') as HTMLSelectElement).value,
    to: (screen.getByLabelText('To') as HTMLSelectElement).value,
    capacity: (screen.getByLabelText('People') as HTMLInputElement).value,
  });

  it('starts with tomorrow, 10:00–12:00, and one person', async () => {
    await setup();

    expect(values()).toEqual({ date: '2026-10-02', from: '10:00', to: '12:00', capacity: '1' });
  });

  it('fills the form from the query string', async () => {
    await setup({ date: '2026-10-15', from: '11:00', to: '15:00', capacity: '20' });

    expect(values()).toEqual({ date: '2026-10-15', from: '11:00', to: '15:00', capacity: '20' });
  });

  it('offers start times up to 22:45 and end times from 06:15 to 23:00', async () => {
    await setup();

    const starts = Array.from(
      (screen.getByLabelText('From') as HTMLSelectElement).options,
      (o) => o.value,
    );
    const ends = Array.from(
      (screen.getByLabelText('To') as HTMLSelectElement).options,
      (o) => o.value,
    );
    expect([starts[0], starts.at(-1)]).toEqual(['06:00', '22:45']);
    expect([ends[0], ends.at(-1)]).toEqual(['06:15', '23:00']);
  });

  it('searches by putting the search in the query string', async () => {
    const { navigate } = await setup();

    await userEvent.selectOptions(screen.getByLabelText('To'), '14:00');
    await userEvent.clear(screen.getByLabelText('People'));
    await userEvent.type(screen.getByLabelText('People'), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(navigate).toHaveBeenCalledWith([], {
      queryParams: { date: '2026-10-02', from: '10:00', to: '14:00', capacity: 12 },
    });
  });

  it.each([
    [{ to: '10:00' }, 'The end must be after the start.'],
    [{ to: '10:15' }, 'A booking lasts at least 30 minutes.'],
  ])('refuses a slot the server would refuse (%o)', async (change, message) => {
    const { navigate } = await setup();

    await userEvent.selectOptions(screen.getByLabelText('To'), change.to);
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('refuses a start that has already passed today', async () => {
    await setup({ date: '2026-10-01', from: '08:00', to: '10:00', capacity: '2' });

    expect(await screen.findByText('The start must be in the future.')).toBeInTheDocument();
  });

  it('shows at once what is wrong with a shared search that cannot be booked', async () => {
    await setup({ date: '2026-09-01', from: '11:00', to: '10:30', capacity: '20' });

    expect(await screen.findByText('Pick a date that is not in the past.')).toBeInTheDocument();
    expect(screen.getByText('The end must be after the start.')).toBeInTheDocument();
  });

  it('asks for at least one person', async () => {
    const { navigate } = await setup();

    await userEvent.clear(screen.getByLabelText('People'));
    await userEvent.type(screen.getByLabelText('People'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('At least 1 person.')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('follows the query string when the browser goes back or forward', async () => {
    const { fixture } = await setup({
      date: '2026-10-15',
      from: '11:00',
      to: '15:00',
      capacity: '20',
    });

    fixture.componentRef.setInput('from', '09:00');
    fixture.componentRef.setInput('capacity', '4');
    await fixture.whenStable();

    expect(values()).toEqual({ date: '2026-10-15', from: '09:00', to: '15:00', capacity: '4' });
  });
});

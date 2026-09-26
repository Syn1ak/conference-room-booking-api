import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import { IAvailableRoom } from '../../../../core/entities/rooms/room.dto';
import userEvent from '@testing-library/user-event';
import { SessionStore } from '../../../../core/services/session/session.store';
import { VenueStore } from '../../../../core/services/venue/venue.store';
import { testSession } from '../../../../core/testing/session.testing';
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

    return { ...result, navigate, http: TestBed.inject(HttpTestingController) };
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
    const { fixture, http } = await setup({
      date: '2026-10-15',
      from: '11:00',
      to: '15:00',
      capacity: '20',
    });
    http.expectOne((r) => r.url === '/api/rooms/available').flush([]);

    fixture.componentRef.setInput('from', '09:00');
    fixture.componentRef.setInput('capacity', '4');
    await new Promise((resolve) => setTimeout(resolve));
    http
      .expectOne((r) => r.url === '/api/rooms/available' && r.params.get('capacity') === '4')
      .flush([]);
    await fixture.whenStable();

    expect(values()).toEqual({ date: '2026-10-15', from: '09:00', to: '15:00', capacity: '4' });
  });

  describe('results', () => {
    const SEARCH = { date: '2026-10-15', from: '11:00', to: '15:00', capacity: '20' };
    const ROOM_A: IAvailableRoom = {
      id: 'a',
      name: 'Room A',
      capacity: 50,
      hourlyPrice: 2000,
      services: [{ serviceId: 'p', name: 'Projector', price: 500 }],
      rentalPrice: 8600,
    };
    const results = () => screen.getByRole('region', { name: /free|Search results|Looking/ });

    it('invites a search before there is one, without asking the server', async () => {
      const { http } = await setup();

      expect(screen.getByRole('heading', { name: 'Search to see free rooms' })).toBeInTheDocument();
      http.expectNone(() => true);
    });

    it('asks for the free rooms with times in the venue offset', async () => {
      const { http } = await setup(SEARCH);

      const request = http.expectOne((r) => r.url === '/api/rooms/available');

      expect(request.request.urlWithParams).toBe(
        '/api/rooms/available?start=2026-10-15T11:00:00%2B03:00&end=2026-10-15T15:00:00%2B03:00&capacity=20',
      );
    });

    it('lists the free rooms with the price for the time and the bands it touches', async () => {
      const { http, fixture } = await setup(SEARCH);

      http.expectOne((r) => r.url === '/api/rooms/available').flush([ROOM_A]);
      await fixture.whenStable();

      expect(screen.getByRole('heading', { name: '1 room is free' })).toBeInTheDocument();
      const card = within(results()).getByRole('listitem');
      expect(card).toHaveTextContent('Room A');
      expect(card).toHaveTextContent('8,600.00 UAH');
      expect(within(card).getByText('Standard')).toBeInTheDocument();
      expect(within(card).getByText('Peak')).toBeInTheDocument();
      expect(within(card).queryByText('Evening')).toBeNull();
    });

    it('says when no room is free', async () => {
      const { http, fixture } = await setup(SEARCH);

      http.expectOne((r) => r.url === '/api/rooms/available').flush([]);
      await fixture.whenStable();

      expect(screen.getByRole('heading', { name: 'No rooms are free then' })).toBeInTheDocument();
    });

    it("shows the server's reason when it refuses the search", async () => {
      const { http, fixture } = await setup(SEARCH);

      http
        .expectOne((r) => r.url === '/api/rooms/available')
        .flush(
          {
            title: 'One or more validation errors occurred.',
            errors: { '': ['A booking must start in the future.'] },
          },
          { status: 400, statusText: 'Bad Request' },
        );
      await fixture.whenStable();

      expect(screen.getByRole('alert')).toHaveTextContent('A booking must start in the future.');
    });

    it('offers to search again after a failure, and recovers', async () => {
      const { http, fixture } = await setup(SEARCH);

      http
        .expectOne((r) => r.url === '/api/rooms/available')
        .flush(null, { status: 503, statusText: 'Unavailable' });
      await fixture.whenStable();
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      http.expectOne((r) => r.url === '/api/rooms/available').flush([ROOM_A]);
      await fixture.whenStable();

      expect(screen.getByRole('heading', { name: '1 room is free' })).toBeInTheDocument();
    });

    it("doesn't search for a time the server would refuse", async () => {
      const { http } = await setup({ ...SEARCH, to: '10:00' });

      http.expectNone((r) => r.url === '/api/rooms/available');
      expect(screen.getByRole('heading', { name: 'Search to see free rooms' })).toBeInTheDocument();
    });

    describe('booking', () => {
      const showResults = async (role?: 'Admin' | 'Client') => {
        sessionStorage.clear();
        if (role) {
          sessionStorage.setItem(
            'crb.session',
            JSON.stringify({ ...testSession({ role }), expiresAt: '2099-01-01T00:00:00Z' }),
          );
        }
        const result = await setup(SEARCH);
        result.http.expectOne((r) => r.url === '/api/rooms/available').flush([ROOM_A]);
        await result.fixture.whenStable();

        return result;
      };

      afterEach(() => sessionStorage.clear());

      it('lets a client book a room', async () => {
        await showResults('Client');

        expect(within(results()).getByRole('button', { name: 'Book' })).toBeInTheDocument();
      });

      it('asks a visitor to sign in, coming back to this search', async () => {
        await showResults();

        expect(within(results()).getByRole('link', { name: 'Sign in to book' })).toHaveAttribute(
          'href',
          expect.stringMatching(/^\/login\?returnUrl=/),
        );
      });

      it("tells staff that bookings are made by clients, and doesn't offer to book", async () => {
        await showResults('Admin');

        expect(within(results()).getByRole('status')).toHaveTextContent(
          'Bookings are made from client accounts.',
        );
        expect(within(results()).queryByRole('button', { name: 'Book' })).toBeNull();
        expect(TestBed.inject(SessionStore).$role()).toBe('Admin');
      });
    });
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { IBooking } from '../../../../core/entities/bookings/booking.dto';
import { testSession } from '../../../../core/testing/session.testing';
import { ConfirmDialogService } from '../../../../shared/features/confirm-dialog/data-access/confirm-dialog.service';
import BookingListComponent from './booking-list.component';

const booking = (id: string, overrides: Partial<IBooking> = {}): IBooking => ({
  id,
  roomId: 'room-a',
  clientId: '7a7110fa-d00c-4857-f10d-08df1bf76434',
  start: '2099-10-15T11:00:00+03:00',
  end: '2099-10-15T15:00:00+03:00',
  durationMinutes: 240,
  attendeeCount: 12,
  status: 'Confirmed',
  cancelledAt: null,
  roomHourlyPrice: 2000,
  services: [],
  rentalPrice: 8600,
  totalPrice: 9400,
  ...overrides,
});

describe('BookingListComponent', () => {
  afterEach(() => sessionStorage.clear());

  const setup = async (role: 'Admin' | 'Client', page?: string) => {
    sessionStorage.setItem(
      'crb.session',
      JSON.stringify({ ...testSession({ role }), expiresAt: '2099-01-01T00:00:00Z' }),
    );
    const result = await render(BookingListComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
      ],
      componentInputs: page ? { page } : {},
    });
    const http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    return { ...result, http, navigate };
  };

  const answer = async (
    { http, fixture }: Awaited<ReturnType<typeof setup>>,
    items: IBooking[],
    totalCount = items.length,
    page = 1,
  ) => {
    http
      .expectOne('/api/rooms')
      .flush([{ id: 'room-a', name: 'Room A', capacity: 50, hourlyPrice: 2000, services: [] }]);
    http
      .expectOne((r) => r.url === '/api/bookings')
      .flush({ items, page, pageSize: 10, totalCount });
    await fixture.whenStable();
  };

  it("lists a client's bookings with the room, time, status, and price", async () => {
    const view = await setup('Client');
    await answer(view, [
      booking('b1'),
      booking('b2', { status: 'Cancelled', cancelledAt: '2099-01-01T10:00:00+02:00' }),
    ]);

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Room A');
    expect(rows[0]).toHaveTextContent('Upcoming');
    expect(rows[0]).toHaveTextContent('11:00–15:00 · 4 h');
    expect(rows[0]).toHaveTextContent('9,400.00 UAH');
    expect(rows[0]).not.toHaveTextContent('Client');
    expect(rows[1]).toHaveTextContent('Cancelled');
  });

  it('asks for the page from the query string, ten at a time', async () => {
    const { http } = await setup('Client', '3');

    const request = http.expectOne((r) => r.url === '/api/bookings');

    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('pageSize')).toBe('10');
  });

  it('shows staff whose booking each one is', async () => {
    const view = await setup('Admin');
    await answer(view, [booking('b1')]);

    expect(screen.getByRole('heading', { name: 'Bookings' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Client 7a7110fa');
  });

  it('invites a client without bookings to find a room', async () => {
    const view = await setup('Client');
    await answer(view, []);

    expect(screen.getByRole('heading', { name: 'No bookings yet' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Bookings' })).getByRole('link', {
        name: 'Find a room',
      }),
    ).toHaveAttribute('href', '/');
  });

  it('pages through the bookings', async () => {
    const view = await setup('Client', '2');
    await answer(view, [booking('b11'), booking('b12')], 12, 2);

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Previous/ })).toHaveAttribute('href', '/?page=1');
    expect(screen.getByRole('link', { name: /Next/ })).toHaveAttribute('aria-disabled', 'true');
  });

  it("doesn't show paging when everything fits on one page", async () => {
    const view = await setup('Client');
    await answer(view, [booking('b1')]);

    expect(screen.queryByRole('navigation', { name: 'Pages' })).toBeNull();
  });

  it('moves to the last page when the page is past the end', async () => {
    const view = await setup('Client', '9');
    await answer(view, [], 12, 9);

    expect(view.navigate).toHaveBeenCalledWith([], { queryParams: { page: 2 }, replaceUrl: true });
  });

  it('offers to try again when the bookings fail to load, and recovers', async () => {
    const view = await setup('Client');
    view.http.expectOne('/api/rooms').flush([]);
    view.http
      .expectOne((r) => r.url === '/api/bookings')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await view.fixture.whenStable();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    view.http.expectOne('/api/rooms').flush([]);
    view.http
      .expectOne((r) => r.url === '/api/bookings')
      .flush({ items: [booking('b1')], page: 1, pageSize: 10, totalCount: 1 });
    await view.fixture.whenStable();

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('offers to cancel only upcoming bookings, and only to clients', async () => {
    const view = await setup('Client');
    await answer(view, [
      booking('upcoming'),
      booking('past', { start: '2020-10-15T11:00:00+03:00', end: '2020-10-15T15:00:00+03:00' }),
      booking('cancelled', { status: 'Cancelled' }),
    ]);

    expect(screen.getAllByRole('button', { name: /^Cancel booking/ })).toHaveLength(1);
  });

  it("doesn't let staff cancel clients' bookings", async () => {
    const view = await setup('Admin');
    await answer(view, [booking('b1')]);

    expect(screen.queryByRole('button', { name: /^Cancel booking/ })).toBeNull();
  });

  it('cancels a booking and reloads the list', async () => {
    const view = await setup('Client');
    await answer(view, [booking('b1')]);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking of Room A' }));
    await new Promise((resolve) => setTimeout(resolve));
    view.http
      .expectOne({ method: 'POST', url: '/api/bookings/b1/cancel' })
      .flush(booking('b1', { status: 'Cancelled' }));

    await vi.waitFor(() =>
      expect(view.http.match((r) => r.url === '/api/bookings')).toHaveLength(1),
    );
    expect(view.http.match('/api/rooms')).toHaveLength(1);
  });
});

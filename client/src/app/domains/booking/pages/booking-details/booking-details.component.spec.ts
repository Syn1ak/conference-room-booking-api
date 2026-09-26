import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { IBooking } from '../../../../core/entities/bookings/booking.dto';
import { testSession } from '../../../../core/testing/session.testing';
import { ConfirmDialogService } from '../../../../shared/features/confirm-dialog/data-access/confirm-dialog.service';
import BookingDetailsComponent from './booking-details.component';

const BOOKING: IBooking = {
  id: 'b1',
  roomId: 'room-a',
  clientId: '7a7110fa-d00c-4857-f10d-08df1bf76434',
  start: '2099-11-05T11:00:00+02:00',
  end: '2099-11-05T15:00:00+02:00',
  durationMinutes: 240,
  attendeeCount: 10,
  status: 'Confirmed',
  cancelledAt: null,
  roomHourlyPrice: 2000,
  services: [{ serviceId: 'p', name: 'Projector', price: 500 }],
  rentalPrice: 8600,
  totalPrice: 9100,
};

describe('BookingDetailsComponent', () => {
  afterEach(() => sessionStorage.clear());

  const setup = async (role: 'Admin' | 'Client' = 'Client') => {
    sessionStorage.setItem(
      'crb.session',
      JSON.stringify({ ...testSession({ role }), expiresAt: '2099-01-01T00:00:00Z' }),
    );
    const result = await render(BookingDetailsComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
      ],
      componentInputs: { id: 'b1' },
    });
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/rooms')
      .flush([{ id: 'room-a', name: 'Room A', capacity: 50, hourlyPrice: 2000, services: [] }]);

    return { ...result, http };
  };

  const answer = async (view: Awaited<ReturnType<typeof setup>>, booking: IBooking = BOOKING) => {
    view.http.expectOne('/api/bookings/b1').flush(booking);
    await view.fixture.whenStable();
  };

  it('shows when, who, and the saved prices', async () => {
    const view = await setup();
    await answer(view);

    expect(screen.getByRole('heading', { name: 'Room A' })).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Thu, 5 Nov 2099')).toBeInTheDocument();
    expect(screen.getByText(/11:00–15:00 · 4 h/)).toBeInTheDocument();
    expect(screen.getByText('10 people')).toBeInTheDocument();
    expect(screen.getByText('8,600.00 UAH')).toBeInTheDocument();
    expect(screen.getByText('Projector')).toBeInTheDocument();
    expect(screen.getByText('9,100.00 UAH')).toBeInTheDocument();
    expect(screen.queryByText('Client')).toBeNull();
  });

  it('says when a cancelled booking was cancelled, and offers no cancel', async () => {
    const view = await setup();
    await answer(view, {
      ...BOOKING,
      status: 'Cancelled',
      cancelledAt: '2099-10-01T09:30:00+03:00',
    });

    expect(screen.getByText('Cancelled on Thu, 1 Oct 2099 at 09:30.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).toBeNull();
  });

  it('shows staff whose booking it is, without a cancel action', async () => {
    const view = await setup('Admin');
    await answer(view);

    expect(screen.getByText(BOOKING.clientId)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).toBeNull();
  });

  it("says a booking isn't found without saying whether it exists", async () => {
    const view = await setup();

    view.http
      .expectOne('/api/bookings/b1')
      .flush({ title: "The booking doesn't exist." }, { status: 404, statusText: 'Not Found' });
    await view.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Booking not found' })).toBeInTheDocument();
  });

  it('offers to try again when the booking fails to load', async () => {
    const view = await setup();

    view.http
      .expectOne('/api/bookings/b1')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await view.fixture.whenStable();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    view.http.expectOne('/api/bookings/b1').flush(BOOKING);
    await view.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Room A' })).toBeInTheDocument();
  });

  it('cancels and shows the booking as cancelled', async () => {
    const view = await setup();
    await answer(view);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await vi.waitFor(() =>
      view.http
        .expectOne({ method: 'POST', url: '/api/bookings/b1/cancel' })
        .flush({ ...BOOKING, status: 'Cancelled' }),
    );
    await vi.waitFor(() =>
      view.http
        .expectOne('/api/bookings/b1')
        .flush({ ...BOOKING, status: 'Cancelled', cancelledAt: '2099-10-01T09:30:00+03:00' }),
    );
    await view.fixture.whenStable();

    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
});

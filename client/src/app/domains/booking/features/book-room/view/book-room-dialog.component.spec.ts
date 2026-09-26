import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { VenueStore } from '../../../../../core/services/venue/venue.store';
import { TEST_VENUE } from '../../../../../core/testing/venue.testing';
import { TBookRoomData } from '../models/book-room.types';
import { BookRoomDialogComponent } from './book-room-dialog.component';

const DATA: TBookRoomData = {
  room: {
    id: 'room-a',
    name: 'Room A',
    capacity: 50,
    hourlyPrice: 2000,
    rentalPrice: 8600,
    services: [
      { serviceId: 'projector', name: 'Projector', price: 500 },
      { serviceId: 'wifi', name: 'Wi-Fi', price: 300 },
      { serviceId: 'water', name: 'Water', price: 0 },
    ],
  },
  date: '2026-10-15',
  from: '11:00',
  to: '15:00',
  capacity: 20,
  refreshResults: () => undefined,
};

const CONFIRMATION = {
  id: 'b1',
  roomId: 'room-a',
  clientId: 'c1',
  start: '2026-10-15T11:00:00+03:00',
  end: '2026-10-15T15:00:00+03:00',
  durationMinutes: 240,
  attendeeCount: 20,
  roomHourlyPrice: 2000,
  rentalLines: [
    {
      band: 'Standard',
      start: '2026-10-15T11:00:00+03:00',
      end: '2026-10-15T12:00:00+03:00',
      hours: 1,
      multiplier: 1,
      amount: 2000,
    },
    {
      band: 'Peak',
      start: '2026-10-15T12:00:00+03:00',
      end: '2026-10-15T14:00:00+03:00',
      hours: 2,
      multiplier: 1.15,
      amount: 4600,
    },
    {
      band: 'Standard',
      start: '2026-10-15T14:00:00+03:00',
      end: '2026-10-15T15:00:00+03:00',
      hours: 1,
      multiplier: 1,
      amount: 2000,
    },
  ],
  services: [
    { serviceId: 'projector', name: 'Projector', price: 500 },
    { serviceId: 'wifi', name: 'Wi-Fi', price: 300 },
  ],
  rentalPrice: 8600,
  totalPrice: 9400,
};

describe('BookRoomDialogComponent', () => {
  const setup = async (overrides: Partial<TBookRoomData> = {}) => {
    const close = vi.fn();
    const refreshResults = vi.fn();
    const data = { ...DATA, ...overrides, refreshResults };
    const result = await render(BookRoomDialogComponent, {
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: { close } },
        { provide: VenueStore, useValue: { venue: TEST_VENUE } },
      ],
    });

    return { ...result, close, refreshResults, http: TestBed.inject(HttpTestingController) };
  };

  const total = () => screen.getByRole('button', { name: /^Book for/ }).textContent?.trim();

  it('describes the slot and starts with the searched headcount', async () => {
    await setup();

    expect(screen.getByRole('heading', { name: 'Book Room A' })).toBeInTheDocument();
    expect(screen.getByText('Thu, 15 Oct 2026 · 11:00–15:00 · 4 h')).toBeInTheDocument();
    expect(screen.getByLabelText('Attendees')).toHaveValue(20);
  });

  it("starts at the room's capacity when the search was for more people", async () => {
    await setup({ capacity: 80 });

    expect(screen.getByLabelText('Attendees')).toHaveValue(50);
  });

  it('costs the rental alone without services', async () => {
    await setup();

    expect(total()).toBe('Book for 8,600.00 UAH');
  });

  it('adds each chosen service once', async () => {
    const { fixture } = await setup();

    await userEvent.click(screen.getByRole('checkbox', { name: /Projector/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Wi-Fi/ }));
    await fixture.whenStable();

    expect(total()).toBe('Book for 9,400.00 UAH');
  });

  it('adds nothing for a free service', async () => {
    const { fixture } = await setup();

    await userEvent.click(screen.getByRole('checkbox', { name: /Water/ }));
    await fixture.whenStable();

    expect(total()).toBe('Book for 8,600.00 UAH');
  });

  it('names each service checkbox with its name and price', async () => {
    await setup();

    expect(screen.getByRole('checkbox', { name: 'Projector 500.00 UAH' })).toBeInTheDocument();
  });

  it('refuses more attendees than the room holds, without calling the server', async () => {
    const { http } = await setup();

    await userEvent.clear(screen.getByLabelText('Attendees'));
    await userEvent.type(screen.getByLabelText('Attendees'), '51');
    await userEvent.click(screen.getByRole('button', { name: /^Book for/ }));

    expect(await screen.findByText('The room holds at most 50 people.')).toBeInTheDocument();
    http.expectNone('/api/bookings');
  });

  const book = async (http: HttpTestingController) => {
    await userEvent.click(screen.getByRole('button', { name: /^Book for/ }));
    return http.expectOne('/api/bookings');
  };

  it('books with the chosen services, without sending a price', async () => {
    const { http } = await setup();

    await userEvent.click(screen.getByRole('checkbox', { name: /Wi-Fi/ }));
    const request = await book(http);

    expect(request.request.body).toEqual({
      roomId: 'room-a',
      start: '2026-10-15T11:00:00+03:00',
      end: '2026-10-15T15:00:00+03:00',
      attendeeCount: 20,
      serviceIds: ['wifi'],
    });
  });

  it("confirms the booking with the server's breakdown of the price", async () => {
    const { http } = await setup();

    (await book(http)).flush(CONFIRMATION, { status: 201, statusText: 'Created' });

    expect(await screen.findByRole('heading', { name: "You're booked" })).toBeInTheDocument();
    const rows = screen
      .getAllByRole('row')
      .map((row) =>
        Array.from(row.querySelectorAll('th, td'), (cell) =>
          cell.textContent?.replace(/\s+/g, ' ').trim(),
        ).join(' '),
      );
    expect(rows).toEqual([
      'Item Time Rate Amount',
      'Standard 11:00–12:00 · 1 h ×1 2,000.00 UAH',
      'Peak 12:00–14:00 · 2 h ×1.15 4,600.00 UAH',
      'Standard 14:00–15:00 · 1 h ×1 2,000.00 UAH',
      'Projector 500.00 UAH',
      'Wi-Fi 300.00 UAH',
      'Total 9,400.00 UAH',
    ]);
  });

  it('hands the booking back when the confirmation is closed', async () => {
    const { http, close } = await setup();

    (await book(http)).flush(CONFIRMATION, { status: 201, statusText: 'Created' });
    await userEvent.click(await screen.findByRole('button', { name: 'Done' }));

    expect(close).toHaveBeenCalledWith({ booking: CONFIRMATION });
  });

  it('explains a slot that was just taken, and refreshes the results behind', async () => {
    const { http, refreshResults } = await setup();

    (await book(http)).flush(
      { title: 'The room is already booked for some or all of this time.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Someone has just booked this room');
    expect(refreshResults).toHaveBeenCalledOnce();
  });

  it('explains a room that no longer exists, and refreshes the results behind', async () => {
    const { http, refreshResults } = await setup();

    (await book(http)).flush(
      { title: "The room doesn't exist." },
      { status: 404, statusText: 'Not Found' },
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('This room no longer exists.');
    expect(refreshResults).toHaveBeenCalledOnce();
  });

  it('puts an attendee count the server refuses on its field', async () => {
    const { http } = await setup();

    (await book(http)).flush(
      { errors: { AttendeeCount: ['The room holds at most 40 people.'] } },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await screen.findByText('The room holds at most 40 people.')).toBeInTheDocument();
    expect(screen.getByLabelText('Attendees')).toHaveAttribute('aria-invalid', 'true');
  });

  it('explains services that changed since the search, and refreshes the results behind', async () => {
    const { http, refreshResults } = await setup();

    await userEvent.click(screen.getByRole('checkbox', { name: /Wi-Fi/ }));
    (await book(http)).flush(
      { errors: { ServiceIds: ["The room doesn't offer the service wifi."] } },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await screen.findByRole('alert')).toHaveTextContent("The room's services have changed");
    expect(refreshResults).toHaveBeenCalledOnce();
  });

  it('keeps the choices when the server is unreachable, so booking can be tried again', async () => {
    const { http } = await setup();

    await userEvent.click(screen.getByRole('checkbox', { name: /Projector/ }));
    (await book(http)).error(new ProgressEvent('error'));

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't reach the server.");
    expect(screen.getByRole('checkbox', { name: /Projector/ })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: /^Book for/ }));
    http.expectOne('/api/bookings');
  });

  it('sends one request however often Book is pressed', async () => {
    const { http } = await setup();
    const button = screen.getByRole('button', { name: /^Book for/ });

    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.dblClick(button);

    expect(http.match('/api/bookings')).toHaveLength(1);
  });

  it('closes without a booking when cancelled', async () => {
    const { close } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(close).toHaveBeenCalledWith(undefined);
  });
});

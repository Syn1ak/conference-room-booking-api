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
};

describe('BookRoomDialogComponent', () => {
  const setup = async (data: TBookRoomData = DATA) => {
    const close = vi.fn();
    const result = await render(BookRoomDialogComponent, {
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: { close } },
        { provide: VenueStore, useValue: { venue: TEST_VENUE } },
      ],
    });

    return { ...result, close, http: TestBed.inject(HttpTestingController) };
  };

  const total = () => screen.getByRole('button', { name: /^Book for/ }).textContent?.trim();

  it('describes the slot and starts with the searched headcount', async () => {
    await setup();

    expect(screen.getByRole('heading', { name: 'Book Room A' })).toBeInTheDocument();
    expect(screen.getByText('Thu, 15 Oct 2026 · 11:00–15:00 · 4 h')).toBeInTheDocument();
    expect(screen.getByLabelText('Attendees')).toHaveValue(20);
  });

  it("starts at the room's capacity when the search was for more people", async () => {
    await setup({ ...DATA, capacity: 80 });

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

  it('books with the chosen services and closes with the booking', async () => {
    const { http, close } = await setup();

    await userEvent.click(screen.getByRole('checkbox', { name: /Wi-Fi/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Book for/ }));
    const request = http.expectOne('/api/bookings');
    expect(request.request.body).toEqual({
      roomId: 'room-a',
      start: '2026-10-15T11:00:00+03:00',
      end: '2026-10-15T15:00:00+03:00',
      attendeeCount: 20,
      serviceIds: ['wifi'],
    });
    request.flush({ id: 'b1', totalPrice: 8900 }, { status: 201, statusText: 'Created' });

    await vi.waitFor(() =>
      expect(close).toHaveBeenCalledWith({ booking: { id: 'b1', totalPrice: 8900 } }),
    );
  });

  it('closes without a booking when cancelled', async () => {
    const { close } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(close).toHaveBeenCalledWith();
  });
});

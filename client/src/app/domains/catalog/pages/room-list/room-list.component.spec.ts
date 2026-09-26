import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { IRoom } from '../../../../core/entities/rooms/room.dto';
import { VenueStore } from '../../../../core/services/venue/venue.store';
import { TEST_VENUE } from '../../../../core/testing/venue.testing';
import RoomListComponent from './room-list.component';

const ROOM_A: IRoom = {
  id: 'a',
  name: 'Room A',
  capacity: 50,
  hourlyPrice: 2000,
  services: [
    { serviceId: 'p', name: 'Projector', price: 500 },
    { serviceId: 'w', name: 'Wi-Fi', price: 300 },
  ],
};

describe('RoomListComponent', () => {
  const setup = async () => {
    const result = await render(RoomListComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: VenueStore, useValue: { venue: TEST_VENUE } },
      ],
    });

    return { ...result, http: TestBed.inject(HttpTestingController) };
  };

  it('shows placeholders while the rooms load', async () => {
    await setup();

    expect(
      screen.getByRole('region', { name: 'Rooms' }).querySelector('[aria-busy="true"]'),
    ).not.toBeNull();
  });

  it('lists each room with its size, rate, and services', async () => {
    const { http, fixture } = await setup();

    http
      .expectOne('/api/rooms')
      .flush([ROOM_A, { ...ROOM_A, id: 'c', name: 'Room C', services: [] }]);
    await fixture.whenStable();

    const rooms = screen
      .getAllByRole('listitem')
      .filter((item) => item.querySelector('app-room-card'));
    expect(rooms).toHaveLength(2);
    const roomA = within(rooms[0]);
    expect(roomA.getByRole('heading', { name: 'Room A' })).toBeInTheDocument();
    expect(roomA.getByText('Up to 50 people')).toBeInTheDocument();
    expect(roomA.getByText('2,000.00 UAH')).toBeInTheDocument();
    expect(roomA.getByText('Projector')).toBeInTheDocument();
    expect(roomA.getByRole('link', { name: /Check availability/ })).toHaveAttribute(
      'href',
      '/?capacity=50',
    );
    expect(within(rooms[1]).getByText('No extra services.')).toBeInTheDocument();
  });

  it('says so when there are no rooms', async () => {
    const { http, fixture } = await setup();

    http.expectOne('/api/rooms').flush([]);
    await fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'No rooms yet' })).toBeInTheDocument();
  });

  it('offers to try again when the rooms fail to load, and recovers', async () => {
    const { http, fixture } = await setup();

    http.expectOne('/api/rooms').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    http.expectOne('/api/rooms').flush([ROOM_A]);
    await fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Room A' })).toBeInTheDocument();
  });

  it('explains how rates change through the day', async () => {
    await setup();

    expect(screen.getByText('Peak')).toBeInTheDocument();
    expect(screen.getByText(/12:00–14:00 · \+15%/)).toBeInTheDocument();
    expect(screen.getByText(/09:00–12:00, 14:00–18:00 · base rate/)).toBeInTheDocument();
  });
});

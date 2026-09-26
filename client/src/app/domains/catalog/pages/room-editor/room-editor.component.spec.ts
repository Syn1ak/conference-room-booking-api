import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import RoomEditorComponent from './room-editor.component';

const CATALOG = [
  { id: 'p', name: 'Projector', standardPrice: 500 },
  { id: 'w', name: 'Wi-Fi', standardPrice: 300 },
];
const ROOM_A = {
  id: 'a',
  name: 'Room A',
  capacity: 50,
  hourlyPrice: 2000,
  services: [{ serviceId: 'p', name: 'Projector', price: 450 }],
};

describe('RoomEditorComponent', () => {
  const setup = async (id?: string) => {
    const result = await render(RoomEditorComponent, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      componentInputs: id ? { id } : {},
    });
    const http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.expectOne('/api/services').flush(CATALOG);
    if (id === 'a') {
      http.expectOne('/api/rooms/a').flush(ROOM_A);
    }
    await result.fixture.whenStable();

    return { ...result, http, navigate };
  };

  const checkbox = (name: string) => screen.getByRole('checkbox', { name });
  const priceOf = (name: string) => screen.getByLabelText(`Price of ${name} in this room, UAH`);

  it('adds a room with the services ticked, sending a price only where one was set', async () => {
    const { http, navigate } = await setup();

    expect(screen.getByRole('heading', { name: 'Add a room' })).toBeInTheDocument();
    expect(priceOf('Projector')).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Name'), 'Room D');
    await userEvent.click(checkbox('Projector'));
    await userEvent.type(priceOf('Projector'), '450');
    await userEvent.click(checkbox('Wi-Fi'));
    await userEvent.click(screen.getByRole('button', { name: 'Add room' }));

    const request = http.expectOne({ method: 'POST', url: '/api/rooms' });
    expect(request.request.body).toEqual({
      name: 'Room D',
      capacity: 10,
      hourlyPrice: 1000,
      services: [{ serviceId: 'p', price: 450 }, { serviceId: 'w' }],
    });
    request.flush({ ...ROOM_A, id: 'd', name: 'Room D' });
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/admin/rooms']));
  });

  it('edits a room, starting from its current state', async () => {
    const { http } = await setup('a');

    expect(screen.getByRole('heading', { name: 'Edit Room A' })).toBeInTheDocument();
    expect(screen.getByLabelText('Capacity')).toHaveValue(50);
    expect(checkbox('Projector')).toBeChecked();
    expect(priceOf('Projector')).toHaveValue(450);
    expect(checkbox('Wi-Fi')).not.toBeChecked();

    await userEvent.click(checkbox('Projector'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(http.expectOne({ method: 'PUT', url: '/api/rooms/a' }).request.body).toEqual({
      name: 'Room A',
      capacity: 50,
      hourlyPrice: 2000,
      services: [],
    });
  });

  it('refuses a service price with too many decimals, without calling the server', async () => {
    const { http } = await setup();

    await userEvent.type(screen.getByLabelText('Name'), 'Room D');
    await userEvent.click(checkbox('Projector'));
    await userEvent.type(priceOf('Projector'), '1.005');
    await userEvent.click(screen.getByRole('button', { name: 'Add room' }));

    expect(
      await screen.findByText('A price can have at most 2 decimal places.'),
    ).toBeInTheDocument();
    http.expectNone('/api/rooms');
  });

  it('refuses a capacity that is not a whole number of people', async () => {
    const { http } = await setup();

    await userEvent.type(screen.getByLabelText('Name'), 'Room D');
    await userEvent.clear(screen.getByLabelText('Capacity'));
    await userEvent.type(screen.getByLabelText('Capacity'), '2.5');
    await userEvent.click(screen.getByRole('button', { name: 'Add room' }));

    expect(await screen.findByText('Enter a whole number of people.')).toBeInTheDocument();
    http.expectNone('/api/rooms');
  });

  it('puts a taken name on the name field', async () => {
    const { http } = await setup();

    await userEvent.type(screen.getByLabelText('Name'), 'room a');
    await userEvent.click(screen.getByRole('button', { name: 'Add room' }));
    http
      .expectOne('/api/rooms')
      .flush(
        { title: 'A room with this name already exists.' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(await screen.findByText('A room with this name already exists.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('reloads the catalog when a service was deleted meanwhile', async () => {
    const { http } = await setup();

    await userEvent.type(screen.getByLabelText('Name'), 'Room D');
    await userEvent.click(checkbox('Wi-Fi'));
    await userEvent.click(screen.getByRole('button', { name: 'Add room' }));
    http
      .expectOne('/api/rooms')
      .flush(
        { errors: { Services: ["The service w isn't in the catalog."] } },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(await screen.findByRole('alert')).toHaveTextContent('The service catalog has changed');
    await vi.waitFor(() => http.expectOne('/api/services'));
  });

  it('knows when there are unsaved changes, and forgets them once saved', async () => {
    const { http, fixture } = await setup('a');
    const page = fixture.componentInstance;

    expect(page.hasUnsavedChanges()).toBe(false);
    await userEvent.type(screen.getByLabelText('Name'), ' Plus');
    expect(page.hasUnsavedChanges()).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    http
      .expectOne({ method: 'PUT', url: '/api/rooms/a' })
      .flush({ ...ROOM_A, name: 'Room A Plus' });
    await vi.waitFor(() => expect(page.hasUnsavedChanges()).toBe(false));
  });

  it('says when the room to edit no longer exists', async () => {
    const result = await render(RoomEditorComponent, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      componentInputs: { id: 'gone' },
    });
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/services').flush(CATALOG);
    http.expectOne('/api/rooms/gone').flush(null, { status: 404, statusText: 'Not Found' });
    await result.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Room not found' })).toBeInTheDocument();
  });
});

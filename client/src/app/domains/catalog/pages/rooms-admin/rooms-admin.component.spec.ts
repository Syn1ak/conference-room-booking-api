import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ToastService } from '../../../../core/services/toast/toast.service';
import { ConfirmDialogService } from '../../../../shared/features/confirm-dialog/data-access/confirm-dialog.service';
import RoomsAdminComponent from './rooms-admin.component';

const ROOM_A = {
  id: 'a',
  name: 'Room A',
  capacity: 50,
  hourlyPrice: 2000,
  services: [{ serviceId: 'p', name: 'Projector', price: 500 }],
};

describe('RoomsAdminComponent', () => {
  const setup = async () => {
    const result = await render(RoomsAdminComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/rooms').flush([ROOM_A]);
    await result.fixture.whenStable();

    return { ...result, http };
  };

  const toastTitles = () =>
    TestBed.inject(ToastService)
      .$items()
      .map((toast) => `${toast.title}: ${toast.message}`);

  it('lists the rooms with their capacity, rate, and number of services', async () => {
    await setup();

    const row = screen.getAllByRole('row')[1];
    expect(
      Array.from(row.querySelectorAll('th, td'), (cell) =>
        cell.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual(['Room A', '50', '2,000.00 UAH', '1', 'Edit Delete']);
    expect(screen.getByRole('link', { name: 'Edit Room A' })).toHaveAttribute(
      'href',
      '/admin/rooms/a/edit',
    );
  });

  it('deletes a room after asking, and reloads', async () => {
    const { http } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Delete Room A' }));
    await vi.waitFor(() =>
      http
        .expectOne({ method: 'DELETE', url: '/api/rooms/a' })
        .flush(null, { status: 204, statusText: 'No Content' }),
    );

    await vi.waitFor(() => expect(http.match('/api/rooms')).toHaveLength(1));
    expect(toastTitles()).toEqual(['Room A deleted: null']);
  });

  it('explains that a booked room can only be edited', async () => {
    const { http } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Delete Room A' }));
    await vi.waitFor(() =>
      http
        .expectOne({ method: 'DELETE', url: '/api/rooms/a' })
        .flush(
          { title: 'A room that has been booked can’t be deleted.' },
          { status: 409, statusText: 'Conflict' },
        ),
    );

    await vi.waitFor(() => expect(toastTitles()[0]).toContain('It has bookings'));
  });
});

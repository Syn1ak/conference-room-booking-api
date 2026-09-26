import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { IBooking } from '../../../core/entities/bookings/booking.dto';
import { ToastService } from '../../../core/services/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/features/confirm-dialog/data-access/confirm-dialog.service';
import { CancelBookingService } from './cancel-booking.service';

const BOOKING = {
  id: 'b1',
  start: '2099-10-15T11:00:00+03:00',
  end: '2099-10-15T15:00:00+03:00',
} as IBooking;

describe('CancelBookingService', () => {
  let confirm: ReturnType<typeof vi.fn>;
  let service: CancelBookingService;
  let http: HttpTestingController;

  beforeEach(() => {
    confirm = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmDialogService, useValue: { confirm } },
      ],
    });
    service = TestBed.inject(CancelBookingService);
    http = TestBed.inject(HttpTestingController);
  });

  const toasts = () =>
    TestBed.inject(ToastService)
      .$items()
      .map((toast) => `${toast.title}: ${toast.message}`);
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  it('asks first, naming the room and time', async () => {
    confirm.mockResolvedValue(false);

    await service.cancel(BOOKING, 'Room A');

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Room A on Thu, 15 Oct 2099, 11:00–15:00'),
        tone: 'danger',
      }),
    );
  });

  it('keeps the booking when the user changes their mind', async () => {
    confirm.mockResolvedValue(false);

    await expect(service.cancel(BOOKING, 'Room A')).resolves.toBe('kept');
    http.expectNone('/api/bookings/b1/cancel');
  });

  it('cancels and says so', async () => {
    const outcome = service.cancel(BOOKING, 'Room A');
    await settle();
    http
      .expectOne({ method: 'POST', url: '/api/bookings/b1/cancel' })
      .flush({ ...BOOKING, status: 'Cancelled' });

    await expect(outcome).resolves.toBe('cancelled');
    expect(toasts()).toEqual([
      'Booking cancelled: Room A on Thu, 15 Oct 2099, 11:00–15:00 is free for others now.',
    ]);
  });

  it("explains a booking that can't be cancelled any more", async () => {
    const outcome = service.cancel(BOOKING, 'Room A');
    await settle();
    http
      .expectOne('/api/bookings/b1/cancel')
      .flush(
        { title: 'The booking is already cancelled.' },
        { status: 409, statusText: 'Conflict' },
      );

    await expect(outcome).resolves.toBe('refused');
    expect(toasts()).toEqual(["Couldn't cancel the booking: The booking is already cancelled."]);
  });

  it('explains a booking that no longer exists', async () => {
    const outcome = service.cancel(BOOKING, 'Room A');
    await settle();
    http.expectOne('/api/bookings/b1/cancel').flush(null, { status: 404, statusText: 'Not Found' });

    await expect(outcome).resolves.toBe('refused');
    expect(toasts()).toEqual(["Couldn't cancel the booking: This booking no longer exists."]);
  });

  it('sends one request when asked again while cancelling', async () => {
    const first = service.cancel(BOOKING, 'Room A');
    await settle();
    const second = await service.cancel(BOOKING, 'Room A');

    expect(second).toBe('kept');
    http.expectOne('/api/bookings/b1/cancel').flush(BOOKING);
    await first;
  });
});

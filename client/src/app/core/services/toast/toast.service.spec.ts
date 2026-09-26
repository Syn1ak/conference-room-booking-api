import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let toasts: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    toasts = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  const titles = () => toasts.$items().map((toast) => toast.title);

  it('shows a toast and dismisses it after five seconds', () => {
    toasts.success('Booking cancelled');

    vi.advanceTimersByTime(4999);
    expect(titles()).toEqual(['Booking cancelled']);

    vi.advanceTimersByTime(1);
    expect(titles()).toEqual([]);
  });

  it('keeps errors for eight seconds', () => {
    toasts.error("Can't reach the server");

    vi.advanceTimersByTime(7999);
    expect(titles()).toEqual(["Can't reach the server"]);

    vi.advanceTimersByTime(1);
    expect(titles()).toEqual([]);
  });

  it('pauses the timer while paused and continues with the time that was left', () => {
    const id = toasts.info('Saved');

    vi.advanceTimersByTime(3000);
    toasts.pause(id);
    vi.advanceTimersByTime(60_000);
    expect(titles()).toEqual(['Saved']);

    toasts.resume(id);
    vi.advanceTimersByTime(1999);
    expect(titles()).toEqual(['Saved']);
    vi.advanceTimersByTime(1);
    expect(titles()).toEqual([]);
  });

  it('drops the oldest toast when a fourth one arrives', () => {
    toasts.info('First');
    toasts.info('Second');
    toasts.info('Third');

    toasts.info('Fourth');

    expect(titles()).toEqual(['Second', 'Third', 'Fourth']);
  });

  it('dismisses a toast on request and ignores its timer afterwards', () => {
    const id = toasts.info('Saved');
    toasts.info('Other');

    toasts.dismiss(id);
    vi.advanceTimersByTime(10_000);

    expect(titles()).toEqual([]);
  });

  it('ignores pause and resume for a toast that is gone', () => {
    toasts.pause(999);
    toasts.resume(999);

    expect(titles()).toEqual([]);
  });
});

import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../services/toast/toast.service';
import { errorInterceptor, SKIP_ERROR_TOAST } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let toasts: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
  });

  const fail = async (
    respond: (request: ReturnType<HttpTestingController['expectOne']>) => void,
    context?: HttpContext,
  ) => {
    const result = firstValueFrom(http.get('/api/rooms', { context }));
    respond(backend.expectOne('/api/rooms'));
    await expect(result).rejects.toBeTruthy();
  };

  const toastTitles = () => toasts.$items().map((toast) => `${toast.title}: ${toast.message}`);

  it("tells the user when the server can't be reached, and still fails the request", async () => {
    await fail((request) => request.error(new ProgressEvent('error')));

    expect(toastTitles()).toEqual(["Can't reach the server: Check your connection and try again."]);
  });

  it('tells the user about a server error', async () => {
    await fail((request) =>
      request.flush('<html></html>', { status: 500, statusText: 'Server Error' }),
    );

    expect(toastTitles()).toEqual([
      'Something went wrong on our side: Please try again in a moment.',
    ]);
  });

  it('tells the user how long to wait after too many requests', async () => {
    await fail((request) =>
      request.flush(
        { title: 'Too many requests.' },
        { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '30' } },
      ),
    );

    expect(toastTitles()).toEqual(['Too many requests: Wait 30 seconds and try again.']);
  });

  it.each([400, 401, 403, 404, 409])('leaves a %i to the page', async (status) => {
    await fail((request) => request.flush({ title: 'Nope' }, { status, statusText: 'Nope' }));

    expect(toastTitles()).toEqual([]);
  });

  it('stays quiet when the caller shows its own message', async () => {
    await fail(
      (request) => request.flush('', { status: 503, statusText: 'Service Unavailable' }),
      new HttpContext().set(SKIP_ERROR_TOAST, true),
    );

    expect(toastTitles()).toEqual([]);
  });

  it('passes successful responses through untouched', async () => {
    const result = firstValueFrom(http.get('/api/rooms'));
    backend.expectOne('/api/rooms').flush([{ name: 'Room A' }]);

    await expect(result).resolves.toEqual([{ name: 'Room A' }]);
    expect(toastTitles()).toEqual([]);
  });
});

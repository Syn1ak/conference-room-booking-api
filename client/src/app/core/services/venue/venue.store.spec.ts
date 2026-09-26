import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TEST_VENUE } from '../../testing/venue.testing';
import { VenueStore } from './venue.store';

describe('VenueStore', () => {
  let store: VenueStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(VenueStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the rules and becomes ready', async () => {
    const loading = store.load();
    expect(store.$status()).toBe('loading');

    http.expectOne('/api/venue').flush(TEST_VENUE);
    await loading;

    expect(store.$status()).toBe('ready');
    expect(store.venue.timeZone).toBe('Europe/Kyiv');
  });

  it("reports an error instead of rejecting when the server can't be reached", async () => {
    const loading = store.load();

    http.expectOne('/api/venue').error(new ProgressEvent('error'));

    await expect(loading).resolves.toBeUndefined();
    expect(store.$status()).toBe('error');
    expect(() => store.venue).toThrow();
  });

  it('recovers when loading again succeeds', async () => {
    const failing = store.load();
    http.expectOne('/api/venue').flush('', { status: 503, statusText: 'Service Unavailable' });
    await failing;

    const retrying = store.load();
    http.expectOne('/api/venue').flush(TEST_VENUE);
    await retrying;

    expect(store.$status()).toBe('ready');
  });
});

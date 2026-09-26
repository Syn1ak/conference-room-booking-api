import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AppComponent } from './app.component';
import { VenueStore } from './core/services/venue/venue.store';
import { TEST_VENUE } from './core/testing/venue.testing';

describe('AppComponent', () => {
  const setup = () =>
    render(AppComponent, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

  it('shows a loading indicator while the venue rules load', async () => {
    await setup();

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('renders the pages once the venue rules have loaded', async () => {
    const { fixture } = await setup();
    const loading = TestBed.inject(VenueStore).load();
    TestBed.inject(HttpTestingController).expectOne('/api/venue').flush(TEST_VENUE);
    await loading;
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });

  it("offers to try again when the server can't be reached, and recovers", async () => {
    const { fixture } = await setup();
    const http = TestBed.inject(HttpTestingController);
    const failing = TestBed.inject(VenueStore).load();
    http.expectOne('/api/venue').error(new ProgressEvent('error'));
    await failing;
    await fixture.whenStable();

    expect(screen.getByRole('alert')).toHaveTextContent("Can't reach the booking service");

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    http.expectOne('/api/venue').flush(TEST_VENUE);
    await fixture.whenStable();

    expect(screen.queryByRole('alert')).toBeNull();
  });
});

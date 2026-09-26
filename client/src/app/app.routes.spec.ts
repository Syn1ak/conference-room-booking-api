import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { VenueStore } from './core/services/venue/venue.store';
import { TEST_VENUE } from './core/testing/venue.testing';

describe('app routes', () => {
  const titleOf = async (url: string) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: VenueStore, useValue: { venue: TEST_VENUE, $venue: () => TEST_VENUE } },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);

    let route = TestBed.inject(Router).routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }

    return route.routeConfig?.title;
  };

  it.each([
    ['/', 'Find a room'],
    ['/?date=2026-10-10&from=10:00&to=12:00&capacity=2', 'Find a room'],
    ['/login', 'Sign in'],
    ['/register', 'Create account'],
    ['/rooms', 'Rooms'],
    ['/no-access', 'No access'],
    ['/nowhere', 'Page not found'],
  ])('opens %s as "%s"', async (url, title) => {
    expect(await titleOf(url)).toBe(title);
  });
});

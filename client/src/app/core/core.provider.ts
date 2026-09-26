import { provideHttpClient } from '@angular/common/http';
import { EnvironmentProviders, inject, provideAppInitializer, Provider } from '@angular/core';
import { provideRouter, Routes, withComponentInputBinding } from '@angular/router';
import { VenueStore } from './services/venue/venue.store';

export type TCoreOptions = {
  routes: Routes;
};

/**
 * Everything the app needs before its first page: routing, HTTP, and the venue's booking rules.
 */
export function provideCore({ routes }: TCoreOptions): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    provideAppInitializer(() => inject(VenueStore).load()),
  ];
}

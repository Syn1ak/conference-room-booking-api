import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, inject, provideAppInitializer, Provider } from '@angular/core';
import { provideRouter, Routes, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { AppTitleStrategy } from './providers/app-title.strategy';
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
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAppInitializer(() => inject(VenueStore).load()),
  ];
}

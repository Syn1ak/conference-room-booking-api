import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, inject, provideAppInitializer, Provider } from '@angular/core';
import {
  provideRouter,
  Routes,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { AppTitleStrategy } from './providers/app-title.strategy';
import { ThemeService } from './services/theme/theme.service';
import { VenueStore } from './services/venue/venue.store';

export type TCoreOptions = {
  routes: Routes;
};

/**
 * Everything the app needs before its first page: routing, HTTP, and the venue's booking rules.
 */
export function provideCore({ routes }: TCoreOptions): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({
        skipInitialTransition: true,
        // A navigation that starts before the previous transition ends skips it; that's expected, not an error.
        onViewTransitionCreated: ({ transition }) => transition.ready.catch(() => undefined),
      }),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAppInitializer(() => {
      inject(ThemeService);
      return inject(VenueStore).load();
    }),
  ];
}

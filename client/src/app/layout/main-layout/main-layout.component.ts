import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';

/**
 * The frame of every page: the header, the page itself, and the footer.
 */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <a
      href="#main"
      class="sr-only z-50 rounded-lg bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to content
    </a>
    <app-header />
    <main id="main" class="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <router-outlet />
    </main>
    <app-footer />
  `,
  host: { class: 'flex min-h-dvh flex-col' },
})
export class MainLayoutComponent {}

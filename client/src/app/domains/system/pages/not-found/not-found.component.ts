import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideMapPinOff } from '@lucide/angular';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';

/**
 * Shown for an address that matches no page.
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, ButtonComponent, LucideMapPinOff],
  template: `
    <div
      class="mb-6 flex size-14 items-center justify-center rounded-2xl bg-surface-muted text-ink-subtle ring-1 ring-line"
    >
      <svg lucideMapPinOff class="size-7"></svg>
    </div>
    <p class="text-sm font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-400">
      404
    </p>
    <h1 class="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Page not found</h1>
    <p class="mt-2 max-w-md text-ink-muted">
      The page you're looking for doesn't exist or has moved.
    </p>
    <a app-button routerLink="/" class="mt-8">Go to the home page</a>
  `,
  host: { class: 'flex flex-col items-center px-4 py-24 text-center' },
})
export default class NotFoundComponent {}

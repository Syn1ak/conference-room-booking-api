import { Component, input, output } from '@angular/core';
import { LucideRefreshCw, LucideTriangleAlert } from '@lucide/angular';
import { ButtonComponent } from '../button/button.component';

/**
 * Says something couldn't be loaded and offers to try again.
 */
@Component({
  selector: 'app-error-state',
  imports: [ButtonComponent, LucideTriangleAlert, LucideRefreshCw],
  template: `
    <div
      class="mb-4 flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20"
    >
      <svg lucideTriangleAlert class="size-6"></svg>
    </div>
    <h2 class="text-base font-semibold text-ink">{{ $title() }}</h2>
    <p class="mt-1 max-w-sm text-sm text-ink-muted">{{ $message() }}</p>
    <button app-button variant="secondary" class="mt-5" type="button" (click)="$retry.emit()">
      <svg lucideRefreshCw class="size-4"></svg>
      Try again
    </button>
  `,
  host: { class: 'flex flex-col items-center px-6 py-12 text-center', role: 'alert' },
})
export class ErrorStateComponent {
  readonly $title = input("Couldn't load this", { alias: 'title' });
  readonly $message = input('Check your connection and try again.', { alias: 'message' });
  readonly $retry = output<void>({ alias: 'retry' });
}

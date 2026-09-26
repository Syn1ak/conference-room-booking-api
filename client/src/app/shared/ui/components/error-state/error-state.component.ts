import { Component, input, output } from '@angular/core';
import { RefreshCw, TriangleAlert } from 'lucide';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';

/**
 * Says something couldn't be loaded and offers to try again.
 */
@Component({
  selector: 'app-error-state',
  imports: [ButtonComponent, IconComponent],
  template: `
    <div
      class="mb-4 flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20"
    >
      <app-icon [icon]="icons.TriangleAlert" class="size-6" />
    </div>
    <h2 class="text-base font-semibold text-ink">{{ $title() }}</h2>
    <p class="mt-1 max-w-sm text-sm text-ink-muted">{{ $message() }}</p>
    <button app-button variant="secondary" class="mt-5" type="button" (click)="$retry.emit()">
      <app-icon [icon]="icons.RefreshCw" class="size-4" />
      Try again
    </button>
  `,
  host: { class: 'flex flex-col items-center px-6 py-12 text-center', role: 'alert' },
})
export class ErrorStateComponent {
  protected readonly icons = { RefreshCw, TriangleAlert };

  readonly $title = input("Couldn't load this", { alias: 'title' });
  readonly $message = input('Check your connection and try again.', { alias: 'message' });
  readonly $retry = output<void>({ alias: 'retry' });
}

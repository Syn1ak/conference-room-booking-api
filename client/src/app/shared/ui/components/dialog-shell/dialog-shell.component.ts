import { Component, input, output } from '@angular/core';
import { X } from 'lucide';
import { IconComponent } from '../icon/icon.component';

/**
 * The frame of a dialog: a title with a close button, the content, and actions (`appDialogActions`) at the bottom.
 */
@Component({
  selector: 'app-dialog-shell',
  imports: [IconComponent],
  template: `
    <header class="flex items-start justify-between gap-4 px-6 pt-6">
      <div class="min-w-0">
        <h2 class="text-lg font-semibold tracking-tight text-ink">{{ $title() }}</h2>
        @if ($description(); as description) {
          <p class="mt-1 text-sm text-ink-muted">{{ description }}</p>
        }
      </div>
      <button
        type="button"
        class="-mt-1 -mr-2 rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink"
        aria-label="Close"
        (click)="$dismiss.emit()"
      >
        <app-icon [icon]="icons.X" class="size-5" />
      </button>
    </header>
    <div class="px-6 py-5"><ng-content /></div>
    <footer
      class="flex flex-col-reverse gap-2 border-t border-line bg-surface-muted/50 px-6 py-4 empty:hidden sm:flex-row sm:justify-end"
    >
      <ng-content select="[appDialogActions]" />
    </footer>
  `,
  host: {
    class:
      'block max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-line bg-surface shadow-float ' +
      'animate-pop-in',
  },
})
export class DialogShellComponent {
  protected readonly icons = { X };

  readonly $title = input.required<string>({ alias: 'title' });
  readonly $description = input<string | null>(null, { alias: 'description' });
  readonly $dismiss = output<void>({ alias: 'dismiss' });
}

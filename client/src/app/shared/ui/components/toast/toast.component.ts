import { Component, computed, input, output } from '@angular/core';
import { CircleAlert, CircleCheck, Info, X } from 'lucide';
import { IconComponent } from '../icon/icon.component';

export type TToastTone = 'info' | 'success' | 'error';

const ICON_CLASSES: Record<TToastTone, string> = {
  info: 'text-brand-600 dark:text-brand-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
};

/**
 * One toast: an icon for its tone, a title, an optional message, and a close button.
 */
@Component({
  selector: 'app-toast',
  imports: [IconComponent],
  template: `
    <span [class]="$iconClasses()">
      @switch ($tone()) {
        @case ('success') {
          <app-icon [icon]="icons.CircleCheck" class="size-5" />
        }
        @case ('error') {
          <app-icon [icon]="icons.CircleAlert" class="size-5" />
        }
        @default {
          <app-icon [icon]="icons.Info" class="size-5" />
        }
      }
    </span>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-ink">{{ $title() }}</p>
      @if ($message(); as message) {
        <p class="mt-0.5 text-sm text-ink-muted">{{ message }}</p>
      }
    </div>
    <button
      type="button"
      class="-m-1 rounded-lg p-1 text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink"
      aria-label="Dismiss"
      (click)="$dismiss.emit()"
    >
      <app-icon [icon]="icons.X" class="size-4" />
    </button>
  `,
  host: {
    class:
      'pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-line bg-surface p-4 ' +
      'shadow-float animate-slide-in',
  },
})
export class ToastComponent {
  protected readonly icons = { CircleAlert, CircleCheck, Info, X };

  readonly $tone = input.required<TToastTone>({ alias: 'tone' });
  readonly $title = input.required<string>({ alias: 'title' });
  readonly $message = input<string | null>(null, { alias: 'message' });
  readonly $dismiss = output<void>({ alias: 'dismiss' });

  protected readonly $iconClasses = computed(() => `mt-px shrink-0 ${ICON_CLASSES[this.$tone()]}`);
}

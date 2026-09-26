import { Component, computed, input, output } from '@angular/core';
import { LucideCircleAlert, LucideCircleCheck, LucideInfo, LucideX } from '@lucide/angular';

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
  imports: [LucideInfo, LucideCircleCheck, LucideCircleAlert, LucideX],
  template: `
    <span [class]="$iconClasses()">
      @switch ($tone()) {
        @case ('success') {
          <svg lucideCircleCheck class="size-5"></svg>
        }
        @case ('error') {
          <svg lucideCircleAlert class="size-5"></svg>
        }
        @default {
          <svg lucideInfo class="size-5"></svg>
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
      <svg lucideX class="size-4"></svg>
    </button>
  `,
  host: {
    class:
      'pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-line bg-surface p-4 ' +
      'shadow-float animate-slide-in',
  },
})
export class ToastComponent {
  readonly $tone = input.required<TToastTone>({ alias: 'tone' });
  readonly $title = input.required<string>({ alias: 'title' });
  readonly $message = input<string | null>(null, { alias: 'message' });
  readonly $dismiss = output<void>({ alias: 'dismiss' });

  protected readonly $iconClasses = computed(() => `mt-px shrink-0 ${ICON_CLASSES[this.$tone()]}`);
}

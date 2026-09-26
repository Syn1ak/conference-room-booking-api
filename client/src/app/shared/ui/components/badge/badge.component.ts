import { Component, computed, input } from '@angular/core';

export type TBadgeTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'morning'
  | 'standard'
  | 'peak'
  | 'evening';

const TONE_CLASSES: Record<TBadgeTone, string> = {
  neutral: 'bg-surface-muted text-ink-muted ring-line-strong',
  brand:
    'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/30',
  success:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
  warning:
    'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  danger:
    'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30',
  morning: 'bg-band-morning/15 text-amber-800 ring-band-morning/40 dark:text-amber-300',
  standard: 'bg-band-standard/15 text-slate-700 ring-band-standard/40 dark:text-slate-300',
  peak: 'bg-band-peak/15 text-rose-700 ring-band-peak/40 dark:text-rose-300',
  evening: 'bg-band-evening/15 text-violet-700 ring-band-evening/40 dark:text-violet-300',
};

/**
 * A small pill for a status or a category, such as a booking's status or a pricing band.
 */
@Component({
  selector: 'app-badge',
  template: '<ng-content />',
  host: {
    '[class]': '$classes()',
  },
})
export class BadgeComponent {
  readonly $tone = input<TBadgeTone>('neutral', { alias: 'tone' });

  protected readonly $classes = computed(() => {
    const tone = this.$tone();

    return (
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ' +
      `ring-1 ring-inset ${TONE_CLASSES[tone]}`
    );
  });
}

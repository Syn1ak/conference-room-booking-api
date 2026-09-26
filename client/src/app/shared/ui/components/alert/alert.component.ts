import { Component, computed, input } from '@angular/core';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide';
import { IconComponent } from '../icon/icon.component';

export type TAlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<TAlertTone, string> = {
  info: 'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100',
  warning:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
  danger:
    'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100',
};

/**
 * A message inside the page, such as why an action failed. Warnings and errors are announced right away.
 */
@Component({
  selector: 'app-alert',
  imports: [IconComponent],
  template: `
    @switch ($tone()) {
      @case ('success') {
        <app-icon [icon]="icons.CircleCheck" class="mt-0.5 size-4 shrink-0" />
      }
      @case ('warning') {
        <app-icon [icon]="icons.TriangleAlert" class="mt-0.5 size-4 shrink-0" />
      }
      @case ('danger') {
        <app-icon [icon]="icons.CircleAlert" class="mt-0.5 size-4 shrink-0" />
      }
      @default {
        <app-icon [icon]="icons.Info" class="mt-0.5 size-4 shrink-0" />
      }
    }
    <div class="min-w-0 text-sm">
      @if ($title(); as title) {
        <p class="font-semibold">{{ title }}</p>
      }
      <div [class]="$title() ? 'mt-0.5' : ''"><ng-content /></div>
    </div>
  `,
  host: {
    '[class]': '$classes()',
    '[attr.role]': "$tone() === 'danger' || $tone() === 'warning' ? 'alert' : 'status'",
  },
})
export class AlertComponent {
  protected readonly icons = { CircleAlert, CircleCheck, Info, TriangleAlert };

  readonly $tone = input<TAlertTone>('info', { alias: 'tone' });
  readonly $title = input<string | null>(null, { alias: 'title' });

  protected readonly $classes = computed(() => {
    const tone = this.$tone();

    return `flex gap-3 rounded-xl border px-4 py-3 ${TONE_CLASSES[tone]}`;
  });
}

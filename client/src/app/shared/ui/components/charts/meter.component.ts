import { Component, computed, input } from '@angular/core';

/**
 * A rate from 0 to 1 as a filled bar with its percentage, such as how full the rooms were.
 */
@Component({
  selector: 'app-meter',
  template: `
    <div class="flex items-baseline justify-between gap-3 text-sm">
      <span class="text-ink-muted">{{ $label() }}</span>
      <span class="font-semibold text-ink tabular-nums">{{ $percent() }}</span>
    </div>
    <div
      class="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
      role="meter"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="$rounded()"
      [attr.aria-label]="$label()"
    >
      <div
        class="h-full rounded-full bg-chart-1 transition-[width] duration-500"
        [style.width.%]="$rounded()"
      ></div>
    </div>
  `,
  host: { class: 'block' },
})
export class MeterComponent {
  readonly $label = input.required<string>({ alias: 'label' });
  readonly $value = input.required<number>({ alias: 'value' });

  protected readonly $rounded = computed(
    () => Math.round(Math.min(1, Math.max(0, this.$value())) * 1000) / 10,
  );
  protected readonly $percent = computed(() => `${this.$rounded()}%`);
}

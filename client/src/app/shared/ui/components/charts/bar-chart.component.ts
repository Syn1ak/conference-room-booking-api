import { Component, computed, input, signal } from '@angular/core';

export type TChartSeries = { name: string; tone: 'chart-1' | 'chart-2' };

export type TBarDatum = {
  /** Short label under the bar, such as "Oct" or "15". */
  label: string;
  /** Full label for the tooltip and the table, such as "October 2026". */
  title: string;
  /** One value per series, stacked from the baseline in series order. */
  values: number[];
};

const TONES = { 'chart-1': 'bg-chart-1', 'chart-2': 'bg-chart-2' };

/**
 * A vertical bar chart, stacked when there are several series. Hovering or focusing a bar shows its values; screen
 * readers get a summary and a table.
 */
@Component({
  selector: 'app-bar-chart',
  template: `
    @if ($series().length > 1) {
      <ul class="mb-4 flex flex-wrap gap-4 text-xs text-ink-muted">
        @for (series of $series(); track series.name) {
          <li class="flex items-center gap-1.5">
            <span class="size-2.5 rounded-sm" [class]="tones[series.tone]"></span>{{ series.name }}
          </li>
        }
      </ul>
    }
    <div class="relative" role="img" [attr.aria-label]="$summary()">
      <div
        class="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line"
        aria-hidden="true"
      >
        <span class="absolute -top-2.5 right-0 bg-surface pl-1 text-[11px] text-ink-subtle">{{
          $format()($max())
        }}</span>
      </div>
      <div class="flex h-48 items-end gap-1 border-b border-line-strong pt-3" aria-hidden="true">
        @for (bar of $bars(); track bar.title; let index = $index) {
          <div
            class="group relative flex h-full min-w-0 flex-1 flex-col-reverse gap-0.5 rounded-t outline-none"
            tabindex="0"
            (mouseenter)="$active.set(index)"
            (mouseleave)="$active.set(null)"
            (focus)="$active.set(index)"
            (blur)="$active.set(null)"
          >
            @for (segment of bar.segments; track $index; let last = $last) {
              <div
                class="w-full transition-opacity group-hover:opacity-80"
                [class]="tones[segment.tone] + (last ? ' rounded-t' : '')"
                [style.height.%]="segment.percent"
              ></div>
            }
            @if ($active() === index) {
              <div
                class="absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-float"
              >
                <p class="font-semibold text-ink">{{ bar.title }}</p>
                @for (segment of bar.segments; track $index) {
                  <p class="text-ink-muted">{{ segment.name }}: {{ $format()(segment.value) }}</p>
                }
              </div>
            }
          </div>
        }
      </div>
      <div class="mt-1.5 flex gap-1 text-[11px] text-ink-subtle" aria-hidden="true">
        @for (bar of $bars(); track bar.title; let index = $index) {
          <span class="min-w-0 flex-1 truncate text-center">{{
            $showLabel()(index) ? bar.label : ''
          }}</span>
        }
      </div>
    </div>
    <table class="sr-only">
      <caption>
        {{
          $caption()
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">Period</th>
          @for (series of $series(); track series.name) {
            <th scope="col">{{ series.name }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (datum of $data(); track datum.title) {
          <tr>
            <th scope="row">{{ datum.title }}</th>
            @for (value of datum.values; track $index) {
              <td>{{ $format()(value) }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  host: { class: 'block' },
})
export class BarChartComponent {
  protected readonly tones = TONES;

  readonly $data = input.required<TBarDatum[]>({ alias: 'data' });
  readonly $series = input.required<TChartSeries[]>({ alias: 'series' });
  readonly $caption = input.required<string>({ alias: 'caption' });
  readonly $format = input<(value: number) => string>((value) => String(value), {
    alias: 'format',
  });

  protected readonly $active = signal<number | null>(null);

  protected readonly $max = computed(() =>
    Math.max(
      0,
      ...this.$data().map((datum) => datum.values.reduce((sum, value) => sum + value, 0)),
    ),
  );

  protected readonly $bars = computed(() => {
    const max = this.$max();
    const series = this.$series();

    return this.$data().map((datum) => ({
      ...datum,
      segments: datum.values.map((value, index) => ({
        value,
        name: series[index]?.name ?? '',
        tone: series[index]?.tone ?? 'chart-1',
        percent: max > 0 ? (value / max) * 100 : 0,
      })),
    }));
  });

  /** With many bars, only every few get a label, so labels never collide. */
  protected readonly $showLabel = computed(() => {
    const step = Math.ceil(this.$data().length / 12);

    return (index: number) => index % step === 0;
  });

  protected readonly $summary = computed(() => {
    const data = this.$data();
    const format = this.$format();
    const totals = data.map((datum) => datum.values.reduce((sum, value) => sum + value, 0));
    const peak = totals.indexOf(Math.max(...totals));

    return data.length === 0 || this.$max() === 0
      ? `${this.$caption()}: nothing yet.`
      : `${this.$caption()}: ${data.length} bars, highest ${format(totals[peak])} in ${data[peak].title}.`;
  });
}

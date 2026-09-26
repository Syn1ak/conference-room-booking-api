import { Component, computed, input } from '@angular/core';

export type TBandTone = 'morning' | 'standard' | 'peak' | 'evening';

export type TTimelineBand = {
  tone: TBandTone;
  label: string;
  /** Minutes since midnight. */
  start: number;
  end: number;
  multiplier: number;
};

export type TTimelineRange = { start: number; end: number };

const TONE_CLASSES: Record<TBandTone, string> = {
  morning: 'bg-band-morning',
  standard: 'bg-band-standard',
  peak: 'bg-band-peak',
  evening: 'bg-band-evening',
};

function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function formatMultiplier(multiplier: number): string {
  const percent = Math.round((multiplier - 1) * 100);

  return percent === 0 ? 'base rate' : `${percent > 0 ? '+' : '−'}${Math.abs(percent)}%`;
}

/**
 * The day's rental rates as a bar: one coloured segment per time band, sized by its length, with its surcharge or
 * discount. An optional range, such as the slot being booked, is outlined on top.
 */
@Component({
  selector: 'app-band-timeline',
  template: `
    <div class="relative">
      <div class="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        @for (band of $segments(); track band.start) {
          <div [class]="band.classes" [style.flex-grow]="band.end - band.start"></div>
        }
      </div>
      @if ($highlightStyle(); as highlight) {
        <div
          class="absolute -top-1 -bottom-1 rounded-full ring-2 ring-ink ring-offset-2 ring-offset-surface transition-all duration-300"
          [style.left.%]="highlight.left"
          [style.width.%]="highlight.width"
          aria-hidden="true"
        ></div>
      }
    </div>
    <div class="mt-2 flex text-[11px] text-ink-subtle tabular-nums" aria-hidden="true">
      @for (band of $segments(); track band.start; let last = $last) {
        <div class="flex justify-between" [style.flex-grow]="band.end - band.start">
          <span>{{ band.startLabel }}</span>
          @if (last) {
            <span>{{ band.endLabel }}</span>
          }
        </div>
      }
    </div>
    <ul class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
      @for (legend of $legend(); track legend.label) {
        <li class="flex items-center gap-2">
          <span [class]="legend.classes" aria-hidden="true"></span>
          <!-- Explicit spaces: Angular drops whitespace between elements, and the words would run together. -->
          <span class="text-ink">{{ legend.label }}</span
          >{{ ' ' }}
          <span class="text-ink-muted">{{ legend.hours }} · {{ legend.rate }}</span>
        </li>
      }
    </ul>
  `,
  host: { class: 'block' },
})
export class BandTimelineComponent {
  readonly $bands = input.required<TTimelineBand[]>({ alias: 'bands' });
  readonly $highlight = input<TTimelineRange | null>(null, { alias: 'highlight' });

  protected readonly $segments = computed(() =>
    this.$bands().map((band) => ({
      ...band,
      classes: `h-full ${TONE_CLASSES[band.tone]}`,
      startLabel: formatTime(band.start),
      endLabel: formatTime(band.end),
    })),
  );

  /** One legend entry per kind of band; the two standard spans share one. */
  protected readonly $legend = computed(() => {
    const byLabel = new Map<string, TTimelineBand[]>();
    for (const band of this.$bands()) {
      byLabel.set(band.label, [...(byLabel.get(band.label) ?? []), band]);
    }

    return [...byLabel.entries()].map(([label, bands]) => ({
      label,
      classes: `size-2.5 rounded-full ${TONE_CLASSES[bands[0].tone]}`,
      hours: bands.map((band) => `${formatTime(band.start)}–${formatTime(band.end)}`).join(', '),
      rate: formatMultiplier(bands[0].multiplier),
    }));
  });

  protected readonly $highlightStyle = computed(() => {
    const bands = this.$bands();
    const highlight = this.$highlight();
    if (!highlight || bands.length === 0 || highlight.end <= highlight.start) {
      return null;
    }

    const dayStart = bands[0].start;
    const dayLength = bands[bands.length - 1].end - dayStart;

    return {
      left: ((highlight.start - dayStart) / dayLength) * 100,
      width: ((highlight.end - highlight.start) / dayLength) * 100,
    };
  });
}

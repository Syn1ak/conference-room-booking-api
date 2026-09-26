import { Component, computed, inject, input } from '@angular/core';
import { ReportsClient } from '../../../../core/services/api/reports/reports.client';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import {
  HeatmapComponent,
  THeatmapRow,
} from '../../../../shared/ui/components/charts/heatmap.component';
import { ErrorStateComponent } from '../../../../shared/ui/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { formatHours, formatRate } from '../../utils/format-report.util';
import { TReportPeriod } from '../../utils/report-period.util';

const BAND_BARS: Record<string, string> = {
  Morning: 'bg-band-morning',
  Standard: 'bg-band-standard',
  Peak: 'bg-band-peak',
  Evening: 'bg-band-evening',
};

/**
 * Demand by time band: how much of each band confirmed bookings fill, over the period and on each weekday. Shows
 * whether the evening discount fills rooms and whether peak hours are really in demand.
 */
@Component({
  selector: 'app-demand-report',
  imports: [CardComponent, ErrorStateComponent, HeatmapComponent, SkeletonComponent],
  template: `
    @if (report.status() === 'loading') {
      <app-card aria-busy="true"><app-skeleton class="h-40 w-full" /></app-card>
    } @else if (report.status() === 'error') {
      <app-card [padded]="false">
        <app-error-state title="Couldn't load the demand report" (retry)="report.reload()" />
      </app-card>
    } @else if ($data(); as data) {
      <div class="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <app-card>
          <h3 class="text-sm font-semibold text-ink">Booked share of each band</h3>
          <ul class="mt-5 grid gap-5">
            @for (band of data.bands; track band.band) {
              <li>
                <div class="flex items-baseline justify-between gap-3 text-sm">
                  <span class="font-medium text-ink">{{ band.band }}</span>
                  <span class="text-ink-muted tabular-nums">
                    {{ rate(band.occupancyRate) }} · {{ hours(band.bookedHours) }} of
                    {{ hours(band.availableHours) }}
                  </span>
                </div>
                <div
                  class="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
                  aria-hidden="true"
                >
                  <div
                    class="h-full rounded-full"
                    [class]="bars[band.band]"
                    [style.width.%]="band.occupancyRate * 100"
                  ></div>
                </div>
              </li>
            }
          </ul>
        </app-card>
        <app-card>
          <h3 class="mb-4 text-sm font-semibold text-ink">By weekday</h3>
          <app-heatmap
            [columns]="$columns()"
            [rows]="$rows()"
            caption="Booked share of each band by weekday"
          />
        </app-card>
      </div>
    }
  `,
})
export class DemandReportComponent {
  protected readonly bars = BAND_BARS;
  protected readonly rate = formatRate;
  protected readonly hours = formatHours;

  readonly $period = input.required<TReportPeriod>({ alias: 'period' });

  protected readonly report = inject(ReportsClient).demandResource(computed(() => this.$period()));
  protected readonly $data = computed(() => (this.report.hasValue() ? this.report.value() : null));
  protected readonly $columns = computed(() => this.$data()?.bands.map((band) => band.band) ?? []);
  protected readonly $rows = computed<THeatmapRow[]>(() =>
    (this.$data()?.weekdays ?? []).map((weekday) => ({
      label: weekday.weekday.slice(0, 3),
      cells: weekday.bands.map((band) => ({
        value: band.occupancyRate,
        detail: `${formatHours(band.bookedHours)} of ${formatHours(band.availableHours)} booked`,
      })),
    })),
  );
}

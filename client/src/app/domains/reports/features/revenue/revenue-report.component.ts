import { Component, computed, inject, input, signal } from '@angular/core';
import { TRevenueGrouping } from '../../../../core/entities/reports/report.dto';
import { ReportsClient } from '../../../../core/services/api/reports/reports.client';
import {
  BarChartComponent,
  TBarDatum,
} from '../../../../shared/ui/components/charts/bar-chart.component';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { ErrorStateComponent } from '../../../../shared/ui/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { formatUah, UahPipe } from '../../../../shared/ui/pipes/uah.pipe';
import { formatWallDate } from '../../../../shared/ui/pipes/wall-date.pipe';
import { formatRate } from '../../utils/format-report.util';
import { TReportPeriod } from '../../utils/report-period.util';

const SERIES = [
  { name: 'Rental', tone: 'chart-1' as const },
  { name: 'Services', tone: 'chart-2' as const },
];

/**
 * Revenue for a period: what confirmed bookings earned and have yet to earn, what cancellations cost, and how it
 * splits by day or month and by room.
 */
@Component({
  selector: 'app-revenue-report',
  imports: [BarChartComponent, CardComponent, ErrorStateComponent, SkeletonComponent, UahPipe],
  templateUrl: './revenue-report.component.html',
})
export class RevenueReportComponent {
  protected readonly series = SERIES;
  protected readonly formatUah = formatUah;
  protected readonly percent = formatRate;

  readonly $period = input.required<TReportPeriod>({ alias: 'period' });

  protected readonly $groupBy = signal<TRevenueGrouping>('Month');
  protected readonly report = inject(ReportsClient).revenueResource(
    computed(() => ({ ...this.$period(), groupBy: this.$groupBy() })),
  );

  protected readonly $data = computed(() => (this.report.hasValue() ? this.report.value() : null));
  protected readonly $isLoading = computed(() => this.report.status() === 'loading');

  protected readonly $bars = computed<TBarDatum[]>(() => {
    const report = this.$data();
    if (!report) {
      return [];
    }

    return report.periods.map((period) =>
      report.groupBy === 'Month'
        ? {
            label: formatWallDate(period.from, 'month'),
            title:
              period.from === period.to
                ? formatWallDate(period.from, 'long')
                : `${formatWallDate(period.from, 'short')} – ${formatWallDate(period.to, 'long')}`,
            values: [period.revenue.rental, period.revenue.services],
          }
        : {
            label: formatWallDate(period.from, 'day'),
            title: formatWallDate(period.from),
            values: [period.revenue.rental, period.revenue.services],
          },
    );
  });
}

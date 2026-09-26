import { Component, computed, inject, input } from '@angular/core';
import { ReportsClient } from '../../../../core/services/api/reports/reports.client';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { ErrorStateComponent } from '../../../../shared/ui/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { UahPipe } from '../../../../shared/ui/pipes/uah.pipe';
import { formatRate } from '../../utils/format-report.util';
import { TReportPeriod } from '../../utils/report-period.util';

/**
 * Service uptake for a period: which extras confirmed bookings include, how often, and what each brings in.
 */
@Component({
  selector: 'app-service-uptake-report',
  imports: [CardComponent, ErrorStateComponent, SkeletonComponent, UahPipe],
  template: `
    @if (report.status() === 'loading') {
      <app-card aria-busy="true"><app-skeleton class="h-40 w-full" /></app-card>
    } @else if (report.status() === 'error') {
      <app-card [padded]="false">
        <app-error-state title="Couldn't load the service report" (retry)="report.reload()" />
      </app-card>
    } @else if ($data(); as data) {
      <app-card class="overflow-x-auto" [padded]="false">
        <div class="px-6 pt-5">
          <h3 class="text-sm font-semibold text-ink">Services by revenue</h3>
          <p class="mt-1 text-xs text-ink-subtle">
            Out of {{ data.bookingCount }} confirmed
            {{ data.bookingCount === 1 ? 'booking' : 'bookings' }} in the period.
          </p>
        </div>
        <table class="mt-3 w-full text-sm whitespace-nowrap">
          <thead
            class="border-y border-line text-left text-xs font-medium tracking-wide text-ink-subtle uppercase"
          >
            <tr>
              <th scope="col" class="px-6 py-3">Service</th>
              <th scope="col" class="px-6 py-3 text-right">Bookings</th>
              <th scope="col" class="px-6 py-3">Share of bookings</th>
              <th scope="col" class="px-6 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            @for (service of $services(); track service.serviceId) {
              <tr>
                <th scope="row" class="px-6 py-3 text-left font-medium text-ink">
                  {{ service.serviceName }}
                </th>
                <td class="px-6 py-3 text-right text-ink-muted tabular-nums">
                  {{ service.bookingCount }}
                </td>
                <td class="w-56 px-6 py-3">
                  <div class="flex items-center gap-2">
                    <div
                      class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted"
                      aria-hidden="true"
                    >
                      <div
                        class="h-full rounded-full bg-chart-2"
                        [style.width.%]="service.attachRate * 100"
                      ></div>
                    </div>
                    <span class="w-12 text-right text-ink tabular-nums">{{
                      rate(service.attachRate)
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-3 text-right font-medium text-ink tabular-nums">
                  {{ service.revenue | uah }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </app-card>
    }
  `,
})
export class ServiceUptakeReportComponent {
  protected readonly rate = formatRate;

  readonly $period = input.required<TReportPeriod>({ alias: 'period' });

  protected readonly report = inject(ReportsClient).serviceUptakeResource(
    computed(() => this.$period()),
  );
  protected readonly $data = computed(() => (this.report.hasValue() ? this.report.value() : null));
  protected readonly $services = computed(() =>
    [...(this.$data()?.services ?? [])].sort(
      (a, b) => b.revenue - a.revenue || a.serviceName.localeCompare(b.serviceName),
    ),
  );
}

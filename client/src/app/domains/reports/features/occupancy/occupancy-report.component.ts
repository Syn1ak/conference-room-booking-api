import { Component, computed, inject, input } from '@angular/core';
import { ReportsClient } from '../../../../core/services/api/reports/reports.client';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { MeterComponent } from '../../../../shared/ui/components/charts/meter.component';
import { ErrorStateComponent } from '../../../../shared/ui/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { formatHours, formatRate } from '../../utils/format-report.util';
import { TReportPeriod } from '../../utils/report-period.util';

/**
 * Occupancy for a period: how much of the rooms' opening hours confirmed bookings fill, and how full the rooms are
 * when booked, overall and per room.
 */
@Component({
  selector: 'app-occupancy-report',
  imports: [CardComponent, ErrorStateComponent, MeterComponent, SkeletonComponent],
  template: `
    @if (report.status() === 'loading') {
      <app-card aria-busy="true"><app-skeleton class="h-40 w-full" /></app-card>
    } @else if (report.status() === 'error') {
      <app-card [padded]="false">
        <app-error-state title="Couldn't load the occupancy report" (retry)="report.reload()" />
      </app-card>
    } @else if ($data(); as data) {
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <app-card class="lg:col-span-2">
          <h3 class="text-sm font-semibold text-ink">All rooms</h3>
          <div class="mt-5 grid gap-6 sm:grid-cols-2">
            <app-meter label="Opening hours booked" [value]="data.overall.occupancyRate" />
            <app-meter label="How full rooms are when booked" [value]="data.overall.fillRate" />
          </div>
        </app-card>
        <app-card>
          <dl class="grid gap-3 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-ink-muted">Booked</dt>
              <dd class="font-medium text-ink tabular-nums">
                {{ hours(data.overall.bookedHours) }} of {{ hours(data.overall.openHours) }}
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-ink-muted">Bookings</dt>
              <dd class="font-medium text-ink tabular-nums">{{ data.overall.bookingCount }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-ink-muted">Average attendees</dt>
              <dd class="font-medium text-ink tabular-nums">{{ data.overall.averageAttendees }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-ink-muted">Cancelled</dt>
              <dd class="font-medium text-ink tabular-nums">
                {{ data.overall.cancellations.count }} · {{ rate(data.overall.cancellations.rate) }}
              </dd>
            </div>
          </dl>
        </app-card>
      </div>

      <app-card class="mt-6 overflow-x-auto" [padded]="false">
        <h3 class="px-6 pt-5 text-sm font-semibold text-ink">By room</h3>
        <table class="mt-3 w-full text-sm whitespace-nowrap">
          <thead
            class="border-y border-line text-left text-xs font-medium tracking-wide text-ink-subtle uppercase"
          >
            <tr>
              <th scope="col" class="px-6 py-3">Room</th>
              <th scope="col" class="px-6 py-3">Occupancy</th>
              <th scope="col" class="px-6 py-3 text-right">Booked</th>
              <th scope="col" class="px-6 py-3 text-right">Avg. attendees</th>
              <th scope="col" class="px-6 py-3 text-right">Fill</th>
              <th scope="col" class="px-6 py-3 text-right">Cancelled</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            @for (room of data.rooms; track room.roomId) {
              <tr>
                <th scope="row" class="px-6 py-3 text-left font-medium text-ink">
                  {{ room.roomName }}
                  <span class="block text-xs font-normal text-ink-subtle"
                    >up to {{ room.capacity }}</span
                  >
                </th>
                <td class="w-48 px-6 py-3">
                  <div class="flex items-center gap-2">
                    <div
                      class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted"
                      aria-hidden="true"
                    >
                      <div
                        class="h-full rounded-full bg-chart-1"
                        [style.width.%]="room.occupancy.occupancyRate * 100"
                      ></div>
                    </div>
                    <span class="w-12 text-right text-ink tabular-nums">{{
                      rate(room.occupancy.occupancyRate)
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-3 text-right text-ink-muted tabular-nums">
                  {{ hours(room.occupancy.bookedHours) }}
                </td>
                <td class="px-6 py-3 text-right text-ink-muted tabular-nums">
                  {{ room.occupancy.averageAttendees }}
                </td>
                <td class="px-6 py-3 text-right text-ink-muted tabular-nums">
                  {{ rate(room.occupancy.fillRate) }}
                </td>
                <td class="px-6 py-3 text-right text-ink-muted tabular-nums">
                  {{ room.occupancy.cancellations.count }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </app-card>
    }
  `,
})
export class OccupancyReportComponent {
  protected readonly rate = formatRate;
  protected readonly hours = formatHours;

  readonly $period = input.required<TReportPeriod>({ alias: 'period' });

  protected readonly report = inject(ReportsClient).occupancyResource(
    computed(() => this.$period()),
  );
  protected readonly $data = computed(() => (this.report.hasValue() ? this.report.value() : null));
}

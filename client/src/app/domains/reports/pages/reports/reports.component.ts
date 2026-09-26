import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { VenueStore } from '../../../../core/services/venue/venue.store';
import { venueToday } from '../../../../core/utils/venue-time.util';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/ui/components/page-header/page-header.component';
import { WallDatePipe } from '../../../../shared/ui/pipes/wall-date.pipe';
import { parsePeriod, periodDays, TReportPeriod } from '../../utils/report-period.util';
import { PeriodPickerComponent } from './view/components/period-picker.component';

/**
 * Reports for staff over a period of venue-local days, kept in the query string so a report can be shared.
 */
@Component({
  selector: 'app-reports',
  imports: [CardComponent, PageHeaderComponent, PeriodPickerComponent, WallDatePipe],
  templateUrl: './reports.component.html',
})
export default class ReportsComponent {
  private readonly router = inject(Router);

  readonly $from = input<string | undefined>(undefined, { alias: 'from' });
  readonly $to = input<string | undefined>(undefined, { alias: 'to' });

  protected readonly today = venueToday(new Date(), inject(VenueStore).venue.timeZone);
  protected readonly $period = computed(() => parsePeriod(this.$from(), this.$to(), this.today));
  protected readonly $days = computed(() => periodDays(this.$period()));

  protected showPeriod(period: TReportPeriod): void {
    void this.router.navigate([], { queryParams: period, queryParamsHandling: 'merge' });
  }
}

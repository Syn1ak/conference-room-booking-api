import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import { IRevenueReport, TRevenueGrouping } from '../../../entities/reports/report.dto';

export type TReportQuery = { from: string; to: string };

/**
 * The report endpoints of the API, for staff. Resources must be created in an injection context and reload when their
 * query changes.
 */
@Injectable({ providedIn: 'root' })
export class ReportsClient {
  revenueResource(
    $query: Signal<TReportQuery & { groupBy: TRevenueGrouping }>,
  ): HttpResourceRef<IRevenueReport | undefined> {
    return httpResource<IRevenueReport>(() => ({
      url: '/api/reports/revenue',
      params: { ...$query() },
    }));
  }
}

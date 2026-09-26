import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import {
  IDemandReport,
  IOccupancyReport,
  IRevenueReport,
  TRevenueGrouping,
} from '../../../entities/reports/report.dto';

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

  occupancyResource($query: Signal<TReportQuery>): HttpResourceRef<IOccupancyReport | undefined> {
    return httpResource<IOccupancyReport>(() => ({
      url: '/api/reports/occupancy',
      params: { ...$query() },
    }));
  }

  demandResource($query: Signal<TReportQuery>): HttpResourceRef<IDemandReport | undefined> {
    return httpResource<IDemandReport>(() => ({
      url: '/api/reports/demand',
      params: { ...$query() },
    }));
  }
}

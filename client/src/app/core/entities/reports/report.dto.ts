/** The days a report covers, in venue time, both included. */
export interface IReportPeriod {
  from: string;
  to: string;
  dayCount: number;
}

/** The bookings that were cancelled, and what they would have paid. */
export interface ICancellationFigures {
  count: number;
  /** Cancelled as a fraction from 0 to 1 of confirmed and cancelled together. */
  rate: number;
  lostRevenue: number;
}

export interface IRevenueFigures {
  bookingCount: number;
  rental: number;
  services: number;
  total: number;
}

export type TRevenueGrouping = 'Day' | 'Month';

export interface IRevenueReport {
  period: IReportPeriod;
  groupBy: TRevenueGrouping;
  confirmed: IRevenueFigures;
  earned: IRevenueFigures;
  upcoming: IRevenueFigures;
  cancellations: ICancellationFigures;
  rooms: {
    roomId: string;
    roomName: string;
    revenue: IRevenueFigures;
    cancellations: ICancellationFigures;
  }[];
  periods: { from: string; to: string; revenue: IRevenueFigures }[];
}

import { addDays } from '../../../core/utils/venue-time.util';

/** Venue-local dates, both included, as the report endpoints take them. */
export type TReportPeriod = { from: string; to: string };

export type TPeriodPreset = { id: string; label: string; period: TReportPeriod };

/** The longest period a report covers, as the API allows (ADR 0007). */
export const MAX_PERIOD_DAYS = 366;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isDate(value: string | null | undefined): value is string {
  return !!value && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function lastDayOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** How many days a period has, counting both ends. */
export function periodDays({ from, to }: TReportPeriod): number {
  return (
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
  );
}

/** Common periods relative to today: this month, last month, the next 30 days, and this year. */
export function periodPresets(today: string): TPeriodPreset[] {
  const [year, month] = today.split('-').map(Number);
  const lastMonthYear = month === 1 ? year - 1 : year;
  const lastMonth = month === 1 ? 12 : month - 1;

  return [
    {
      id: 'this-month',
      label: 'This month',
      period: { from: `${today.slice(0, 7)}-01`, to: lastDayOfMonth(year, month) },
    },
    {
      id: 'last-month',
      label: 'Last month',
      period: {
        from: `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`,
        to: lastDayOfMonth(lastMonthYear, lastMonth),
      },
    },
    { id: 'next-30-days', label: 'Next 30 days', period: { from: today, to: addDays(today, 29) } },
    { id: 'this-year', label: 'This year', period: { from: `${year}-01-01`, to: `${year}-12-31` } },
  ];
}

/** What's wrong with a period, by the API's rules, or nothing. */
export function periodProblem(period: TReportPeriod): string | undefined {
  if (!isDate(period.from) || !isDate(period.to)) {
    return 'Pick both dates.';
  }

  if (period.to < period.from) {
    return "The period can't end before it starts.";
  }

  return periodDays(period) > MAX_PERIOD_DAYS
    ? `A report covers at most ${MAX_PERIOD_DAYS} days.`
    : undefined;
}

/** The period from the query string, or this month when it's missing or invalid. */
export function parsePeriod(
  from: string | undefined,
  to: string | undefined,
  today: string,
): TReportPeriod {
  const period = { from: from ?? '', to: to ?? '' };

  return periodProblem(period) ? periodPresets(today)[0].period : period;
}

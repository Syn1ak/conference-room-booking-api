const HOURS = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** A rate from 0 to 1 as a percentage with at most one decimal: 0.4231 → "42.3%". */
export function formatRate(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

/** A number of hours, dropping needless decimals and grouping thousands: 7.25 → "7.25 h", 1234 → "1,234 h". */
export function formatHours(hours: number): string {
  return `${HOURS.format(hours)} h`;
}

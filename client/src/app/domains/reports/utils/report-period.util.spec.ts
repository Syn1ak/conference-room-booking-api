import { parsePeriod, periodDays, periodPresets, periodProblem } from './report-period.util';

describe('report periods', () => {
  const presets = (today: string) =>
    Object.fromEntries(periodPresets(today).map((preset) => [preset.id, preset.period]));

  it('offers this month, last month, the next 30 days, and this year', () => {
    expect(presets('2026-09-26')).toEqual({
      'this-month': { from: '2026-09-01', to: '2026-09-30' },
      'last-month': { from: '2026-08-01', to: '2026-08-31' },
      'next-30-days': { from: '2026-09-26', to: '2026-10-25' },
      'this-year': { from: '2026-01-01', to: '2026-12-31' },
    });
  });

  it('crosses into the previous year in January', () => {
    expect(presets('2027-01-10')['last-month']).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  it('knows February has 29 days in a leap year', () => {
    expect(presets('2028-02-10')['this-month']).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(presets('2027-03-10')['last-month']).toEqual({ from: '2027-02-01', to: '2027-02-28' });
  });

  it('counts both ends', () => {
    expect(periodDays({ from: '2026-09-01', to: '2026-09-01' })).toBe(1);
    expect(periodDays({ from: '2028-01-01', to: '2028-12-31' })).toBe(366);
  });

  it('allows up to 366 days, like the API', () => {
    expect(periodProblem({ from: '2028-01-01', to: '2028-12-31' })).toBeUndefined();
    expect(periodProblem({ from: '2026-01-01', to: '2027-01-02' })).toBe(
      'A report covers at most 366 days.',
    );
  });

  it("refuses a period that ends before it starts, or isn't dates", () => {
    expect(periodProblem({ from: '2026-09-10', to: '2026-09-09' })).toBe(
      "The period can't end before it starts.",
    );
    expect(periodProblem({ from: '', to: '2026-09-09' })).toBe('Pick both dates.');
  });

  it('falls back to this month for a missing or invalid period in the query string', () => {
    expect(parsePeriod(undefined, undefined, '2026-09-26')).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(parsePeriod('2026-09-10', '2026-09-01', '2026-09-26')).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(parsePeriod('2026-07-01', '2026-07-31', '2026-09-26')).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
    });
  });
});

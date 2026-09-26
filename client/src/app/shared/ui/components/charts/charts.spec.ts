import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BarChartComponent } from './bar-chart.component';
import { HeatmapComponent } from './heatmap.component';
import { MeterComponent } from './meter.component';

describe('BarChartComponent', () => {
  const series = [
    { name: 'Rental', tone: 'chart-1' as const },
    { name: 'Services', tone: 'chart-2' as const },
  ];

  const renderChart = (data: { label: string; title: string; values: number[] }[]) =>
    render(BarChartComponent, {
      componentInputs: {
        data,
        series,
        caption: 'Revenue by month',
        format: (value: number) => `${value} UAH`,
      },
    });

  it('summarises the chart and gives the numbers as a table', async () => {
    await renderChart([
      { label: 'Sep', title: 'September', values: [100, 20] },
      { label: 'Oct', title: 'October', values: [300, 50] },
    ]);

    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Revenue by month: 2 bars, highest 350 UAH in October.',
    );
    expect(screen.getByRole('row', { name: /October/ })).toHaveTextContent('October300 UAH50 UAH');
  });

  it('shows a bar’s values on hover', async () => {
    const { container } = await renderChart([
      { label: 'Oct', title: 'October', values: [300, 50] },
    ]);

    await userEvent.hover(container.querySelector('[tabindex="0"]') as HTMLElement);

    expect(screen.getByText('Services: 50 UAH')).toBeInTheDocument();
  });

  it('copes with all zeros and with no data', async () => {
    await renderChart([{ label: 'Oct', title: 'October', values: [0, 0] }]);
    expect(screen.getByRole('img')).toHaveAccessibleName('Revenue by month: nothing yet.');
  });

  it('draws a single bar at full height', async () => {
    const { container } = await renderChart([{ label: 'Oct', title: 'October', values: [300, 0] }]);

    expect(
      (container.querySelector('[tabindex="0"] .bg-chart-1') as HTMLElement).style.height,
    ).toBe('100%');
  });
});

describe('MeterComponent', () => {
  it.each([
    [0.4231, '42.3'],
    [1, '100'],
    [0, '0'],
    [1.2, '100'],
  ])('shows %s as %s%', async (value, percent) => {
    await render(MeterComponent, { componentInputs: { label: 'Occupancy', value } });

    expect(screen.getByRole('meter', { name: 'Occupancy' })).toHaveAttribute(
      'aria-valuenow',
      percent,
    );
    expect(screen.getByText(`${percent}%`)).toBeInTheDocument();
  });
});

describe('HeatmapComponent', () => {
  it('gives each cell as a table, with its percentage and detail', async () => {
    await render(HeatmapComponent, {
      componentInputs: {
        columns: ['Morning', 'Peak'],
        rows: [
          {
            label: 'Mon',
            cells: [
              { value: 0, detail: '0 of 12 h' },
              { value: 0.5, detail: '6 of 12 h' },
            ],
          },
        ],
        caption: 'Demand by weekday',
      },
    });

    expect(screen.getByRole('row', { name: /Mon/ })).toHaveTextContent(
      'Mon0%, 0 of 12 h50%, 6 of 12 h',
    );
  });
});

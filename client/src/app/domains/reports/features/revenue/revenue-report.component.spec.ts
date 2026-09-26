import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { IRevenueReport } from '../../../../core/entities/reports/report.dto';
import { RevenueReportComponent } from './revenue-report.component';

const figures = (total: number, bookingCount = 1) => ({
  bookingCount,
  rental: total - 100,
  services: 100,
  total,
});

const REPORT: IRevenueReport = {
  period: { from: '2026-09-01', to: '2026-10-31', dayCount: 61 },
  groupBy: 'Month',
  confirmed: figures(9400, 2),
  earned: figures(1000),
  upcoming: figures(8400),
  cancellations: { count: 1, rate: 0.3333, lostRevenue: 2000 },
  rooms: [
    {
      roomId: 'a',
      roomName: 'Room A',
      revenue: figures(9400, 2),
      cancellations: { count: 1, rate: 0.3333, lostRevenue: 2000 },
    },
  ],
  periods: [
    { from: '2026-09-01', to: '2026-09-30', revenue: figures(1000) },
    { from: '2026-10-01', to: '2026-10-31', revenue: figures(8400) },
  ],
};

describe('RevenueReportComponent', () => {
  const setup = async () => {
    const result = await render(RevenueReportComponent, {
      providers: [provideHttpClient(), provideHttpClientTesting()],
      componentInputs: { period: { from: '2026-09-01', to: '2026-10-31' } },
    });

    return { ...result, http: TestBed.inject(HttpTestingController) };
  };

  it('asks for the period by month', async () => {
    const { http } = await setup();

    const request = http.expectOne((r) => r.url === '/api/reports/revenue');

    expect(request.request.params.toString()).toBe('from=2026-09-01&to=2026-10-31&groupBy=Month');
  });

  it('shows confirmed, earned, upcoming, and lost revenue', async () => {
    const { http, fixture } = await setup();
    http.expectOne((r) => r.url === '/api/reports/revenue').flush(REPORT);
    await fixture.whenStable();

    const tiles = screen.getAllByRole('definition').map((tile) => tile.textContent?.trim());
    expect(tiles).toContain('9,400.00 UAH');
    expect(tiles).toContain('1,000.00 UAH');
    expect(tiles).toContain('8,400.00 UAH');
    expect(tiles).toContain('2,000.00 UAH');
    expect(screen.getByText('1 cancelled · 33.3% of bookings')).toBeInTheDocument();
  });

  it('draws revenue per month and lists it per room', async () => {
    const { http, fixture } = await setup();
    http.expectOne((r) => r.url === '/api/reports/revenue').flush(REPORT);
    await fixture.whenStable();

    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Revenue of confirmed bookings: 2 bars, highest 8,400.00 UAH in 1 Oct – 31 Oct 2026.',
    );
    expect(screen.getByRole('row', { name: /Room A/ })).toHaveTextContent('9,400.00 UAH');
  });

  it('regroups by day', async () => {
    const { http, fixture } = await setup();
    http.expectOne((r) => r.url === '/api/reports/revenue').flush(REPORT);
    await fixture.whenStable();

    await userEvent.click(screen.getByRole('radio', { name: 'By day' }));

    expect(
      http.expectOne((r) => r.url === '/api/reports/revenue').request.params.get('groupBy'),
    ).toBe('Day');
  });

  it('offers to try again after a failure', async () => {
    const { http, fixture } = await setup();
    http
      .expectOne((r) => r.url === '/api/reports/revenue')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    http.expectOne((r) => r.url === '/api/reports/revenue');
  });
});

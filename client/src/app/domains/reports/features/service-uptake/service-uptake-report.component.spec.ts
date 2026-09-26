import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { ServiceUptakeReportComponent } from './service-uptake-report.component';

describe('ServiceUptakeReportComponent', () => {
  it('lists the services by revenue, including ones nobody booked', async () => {
    const { fixture } = await render(ServiceUptakeReportComponent, {
      providers: [provideHttpClient(), provideHttpClientTesting()],
      componentInputs: { period: { from: '2026-10-01', to: '2026-10-31' } },
    });

    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === '/api/reports/services')
      .flush({
        period: { from: '2026-10-01', to: '2026-10-31', dayCount: 31 },
        bookingCount: 4,
        services: [
          {
            serviceId: 'p',
            serviceName: 'Projector',
            bookingCount: 1,
            attachRate: 0.25,
            revenue: 500,
          },
          { serviceId: 's', serviceName: 'Sound', bookingCount: 0, attachRate: 0, revenue: 0 },
          { serviceId: 'w', serviceName: 'Wi-Fi', bookingCount: 3, attachRate: 0.75, revenue: 900 },
        ],
      });
    await fixture.whenStable();

    const rows = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent?.replace(/\s+/g, ' ').trim());
    expect(rows).toEqual([
      'Wi-Fi 3 75% 900.00 UAH',
      'Projector 1 25% 500.00 UAH',
      'Sound 0 0% 0.00 UAH',
    ]);
    expect(screen.getByText('Out of 4 confirmed bookings in the period.')).toBeInTheDocument();
  });
});

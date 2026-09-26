import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { IBandDemand } from '../../../../core/entities/reports/report.dto';
import { DemandReportComponent } from './demand-report.component';

const bands = (peak: number): IBandDemand[] => [
  { band: 'Morning', bookedHours: 0, availableHours: 3, occupancyRate: 0 },
  { band: 'Standard', bookedHours: 0, availableHours: 7, occupancyRate: 0 },
  { band: 'Peak', bookedHours: peak * 2, availableHours: 2, occupancyRate: peak },
  { band: 'Evening', bookedHours: 0, availableHours: 5, occupancyRate: 0 },
];

describe('DemandReportComponent', () => {
  it('shows each band over the period and on each weekday', async () => {
    const { fixture } = await render(DemandReportComponent, {
      providers: [provideHttpClient(), provideHttpClientTesting()],
      componentInputs: { period: { from: '2026-10-05', to: '2026-10-06' } },
    });

    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === '/api/reports/demand')
      .flush({
        period: { from: '2026-10-05', to: '2026-10-06', dayCount: 2 },
        bands: bands(0.5),
        weekdays: [
          { weekday: 'Monday', dayCount: 1, bands: bands(1) },
          { weekday: 'Tuesday', dayCount: 1, bands: bands(0) },
        ],
      });
    await fixture.whenStable();

    expect(screen.getByText('50% · 1 h of 2 h')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Mon/ })).toHaveTextContent('100%, 2 h of 2 h booked');
    expect(screen.getByRole('row', { name: /Tue/ })).toHaveTextContent('0%, 0 h of 2 h booked');
  });
});

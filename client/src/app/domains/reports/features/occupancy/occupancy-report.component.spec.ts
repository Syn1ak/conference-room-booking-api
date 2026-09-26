import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { IOccupancyFigures } from '../../../../core/entities/reports/report.dto';
import { OccupancyReportComponent } from './occupancy-report.component';

const figures = (overrides: Partial<IOccupancyFigures> = {}): IOccupancyFigures => ({
  bookingCount: 0,
  bookedHours: 0,
  openHours: 17,
  occupancyRate: 0,
  averageAttendees: 0,
  fillRate: 0,
  cancellations: { count: 0, rate: 0, lostRevenue: 0 },
  ...overrides,
});

describe('OccupancyReportComponent', () => {
  it('shows occupancy overall and per room, including rooms without bookings', async () => {
    const { fixture } = await render(OccupancyReportComponent, {
      providers: [provideHttpClient(), provideHttpClientTesting()],
      componentInputs: { period: { from: '2026-10-01', to: '2026-10-01' } },
    });
    const http = TestBed.inject(HttpTestingController);

    http
      .expectOne((r) => r.url === '/api/reports/occupancy' && r.params.get('from') === '2026-10-01')
      .flush({
        period: { from: '2026-10-01', to: '2026-10-01', dayCount: 1 },
        overall: figures({
          bookingCount: 1,
          bookedHours: 4.25,
          openHours: 34,
          occupancyRate: 0.125,
          averageAttendees: 12,
          fillRate: 0.24,
        }),
        rooms: [
          {
            roomId: 'a',
            roomName: 'Room A',
            capacity: 50,
            occupancy: figures({ bookedHours: 4.25, occupancyRate: 0.25, fillRate: 0.24 }),
          },
          { roomId: 'c', roomName: 'Room C', capacity: 30, occupancy: figures() },
        ],
      });
    await fixture.whenStable();

    expect(screen.getByRole('meter', { name: 'Opening hours booked' })).toHaveAttribute(
      'aria-valuenow',
      '12.5',
    );
    expect(screen.getByRole('meter', { name: 'How full rooms are when booked' })).toHaveAttribute(
      'aria-valuenow',
      '24',
    );
    expect(screen.getByText('4.25 h of 34 h')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Room A/ })).toHaveTextContent('25%');
    expect(screen.getByRole('row', { name: /Room C/ })).toHaveTextContent('0%');
  });
});

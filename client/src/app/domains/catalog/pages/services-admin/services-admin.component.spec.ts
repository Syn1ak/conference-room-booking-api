import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import ServicesAdminComponent from './services-admin.component';

describe('ServicesAdminComponent', () => {
  const setup = async () => {
    const result = await render(ServicesAdminComponent, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    return { ...result, http: TestBed.inject(HttpTestingController) };
  };

  it('lists the services with their standard prices', async () => {
    const { http, fixture } = await setup();

    http.expectOne('/api/services').flush([
      { id: 'p', name: 'Projector', standardPrice: 500 },
      { id: 'w', name: 'Wi-Fi', standardPrice: 300.5 },
    ]);
    await fixture.whenStable();

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Projector 500.00 UAH Edit',
      'Wi-Fi 300.50 UAH Edit',
    ]);
  });

  it('says when there are no services', async () => {
    const { http, fixture } = await setup();

    http.expectOne('/api/services').flush([]);
    await fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'No services yet' })).toBeInTheDocument();
  });

  it('offers to try again after a failure', async () => {
    const { http, fixture } = await setup();

    http.expectOne('/api/services').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    http.expectOne('/api/services').flush([{ id: 'p', name: 'Projector', standardPrice: 500 }]);
    await fixture.whenStable();

    expect(screen.getByText('Projector')).toBeInTheDocument();
  });
});

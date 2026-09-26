import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ToastService } from '../../../../core/services/toast/toast.service';
import { ConfirmDialogService } from '../../../../shared/features/confirm-dialog/data-access/confirm-dialog.service';
import ServicesAdminComponent from './services-admin.component';

describe('ServicesAdminComponent', () => {
  let confirmed = true;

  beforeEach(() => (confirmed = true));

  const setup = async () => {
    const result = await render(ServicesAdminComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(confirmed) } },
      ],
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
      'Projector 500.00 UAH Edit Delete',
      'Wi-Fi 300.50 UAH Edit Delete',
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

  const showProjector = async () => {
    const view = await setup();
    view.http
      .expectOne('/api/services')
      .flush([{ id: 'p', name: 'Projector', standardPrice: 500 }]);
    await view.fixture.whenStable();
    return view;
  };

  const toastTitles = () =>
    TestBed.inject(ToastService)
      .$items()
      .map((toast) => `${toast.title}: ${toast.message}`);

  it('deletes a service after asking, and reloads', async () => {
    const { http } = await showProjector();

    await userEvent.click(screen.getByRole('button', { name: 'Delete Projector' }));
    await vi.waitFor(() =>
      http
        .expectOne({ method: 'DELETE', url: '/api/services/p' })
        .flush(null, { status: 204, statusText: 'No Content' }),
    );

    await vi.waitFor(() => expect(http.match('/api/services')).toHaveLength(1));
    expect(toastTitles()).toEqual(['Projector deleted: null']);
  });

  it('keeps a service when the user changes their mind', async () => {
    confirmed = false;
    const { http } = await showProjector();

    await userEvent.click(screen.getByRole('button', { name: 'Delete Projector' }));
    await new Promise((resolve) => setTimeout(resolve));

    http.expectNone({ method: 'DELETE', url: '/api/services/p' });
  });

  it('explains why a service in use cannot be deleted', async () => {
    const { http } = await showProjector();

    await userEvent.click(screen.getByRole('button', { name: 'Delete Projector' }));
    await vi.waitFor(() =>
      http.expectOne({ method: 'DELETE', url: '/api/services/p' }).flush(
        {
          title: "The service can't be deleted while a room offers it or a booking includes it.",
        },
        { status: 409, statusText: 'Conflict' },
      ),
    );

    await vi.waitFor(() =>
      expect(toastTitles()).toEqual([
        "Can't delete Projector: The service can't be deleted while a room offers it or a booking includes it.",
      ]),
    );
  });
});

import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { IService } from '../../../../../core/entities/services/service.dto';
import { ServiceFormDialogComponent } from './service-form-dialog.component';

describe('ServiceFormDialogComponent', () => {
  const setup = async (service: IService | null = null) => {
    const close = vi.fn();
    const result = await render(ServiceFormDialogComponent, {
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DIALOG_DATA, useValue: { service } },
        { provide: DialogRef, useValue: { close } },
      ],
    });

    return { ...result, close, http: TestBed.inject(HttpTestingController) };
  };

  const fill = async (name: string, price: string) => {
    await userEvent.clear(screen.getByLabelText('Name'));
    if (name) {
      await userEvent.type(screen.getByLabelText('Name'), name);
    }
    await userEvent.clear(screen.getByLabelText('Standard price, UAH'));
    await userEvent.type(screen.getByLabelText('Standard price, UAH'), price);
  };

  it('adds a service, trimming its name', async () => {
    const { http, close } = await setup();

    await fill('  Coffee break ', '250.5');
    await userEvent.click(screen.getByRole('button', { name: 'Add service' }));
    const request = http.expectOne({ method: 'POST', url: '/api/services' });
    expect(request.request.body).toEqual({ name: 'Coffee break', standardPrice: 250.5 });
    request.flush({ id: 's1', name: 'Coffee break', standardPrice: 250.5 });

    await vi.waitFor(() =>
      expect(close).toHaveBeenCalledWith({ id: 's1', name: 'Coffee break', standardPrice: 250.5 }),
    );
  });

  it('edits a service, starting from its current details', async () => {
    const { http } = await setup({ id: 'p', name: 'Projector', standardPrice: 500 });

    expect(screen.getByRole('heading', { name: 'Edit Projector' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Projector');
    await fill('Projector 4K', '650');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(http.expectOne({ method: 'PUT', url: '/api/services/p' }).request.body).toEqual({
      name: 'Projector 4K',
      standardPrice: 650,
    });
  });

  it.each([
    ['1.005', 'A price can have at most 2 decimal places.'],
    ['-5', "A price can't be negative."],
    ['1000001', 'A price can be at most 1,000,000 UAH.'],
  ])('refuses the price %s without calling the server', async (price, message) => {
    const { http } = await setup();

    await fill('Coffee', price);
    await userEvent.click(screen.getByRole('button', { name: 'Add service' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    http.expectNone('/api/services');
  });

  it('accepts a free service', async () => {
    const { http } = await setup();

    await fill('Water', '0');
    await userEvent.click(screen.getByRole('button', { name: 'Add service' }));

    http.expectOne('/api/services');
  });

  it('asks for a name', async () => {
    const { http } = await setup();

    await fill('', '10');
    await userEvent.click(screen.getByRole('button', { name: 'Add service' }));

    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    http.expectNone('/api/services');
  });

  it('puts a taken name on the name field', async () => {
    const { http } = await setup();

    await fill('wi-fi', '10');
    await userEvent.click(screen.getByRole('button', { name: 'Add service' }));
    http
      .expectOne('/api/services')
      .flush(
        { title: 'A service with this name already exists.' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(await screen.findByText('A service with this name already exists.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('explains a service that was deleted while being edited', async () => {
    const { http } = await setup({ id: 'p', name: 'Projector', standardPrice: 500 });

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    http.expectOne('/api/services/p').flush(null, { status: 404, statusText: 'Not Found' });

    expect(await screen.findByRole('alert')).toHaveTextContent('This service no longer exists');
  });
});

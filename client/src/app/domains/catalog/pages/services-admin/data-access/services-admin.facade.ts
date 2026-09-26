import { computed, inject, Injectable } from '@angular/core';
import { ServicesClient } from '../../../../../core/services/api/services/services.client';

/**
 * The services admin page's data: the catalog of services. Provided by the page.
 */
@Injectable()
export class ServicesAdminFacade {
  private readonly services = inject(ServicesClient).servicesResource();

  readonly $services = computed(() => (this.services.hasValue() ? this.services.value() : []));
  readonly $isLoading = computed(() => this.services.status() === 'loading');
  readonly $hasError = computed(() => this.services.status() === 'error');

  reload(): void {
    this.services.reload();
  }
}

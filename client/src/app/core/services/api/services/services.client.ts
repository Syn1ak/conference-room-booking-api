import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IService } from '../../../entities/services/service.dto';

/**
 * The catalog services endpoints of the API. Resources must be created in an injection context, such as a page's
 * facade.
 */
@Injectable({ providedIn: 'root' })
export class ServicesClient {
  servicesResource(): HttpResourceRef<IService[] | undefined> {
    return httpResource<IService[]>(() => '/api/services');
  }
}

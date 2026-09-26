import { HttpClient, HttpContext, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IService, IServiceRequest } from '../../../entities/services/service.dto';

/**
 * The catalog services endpoints of the API. Resources must be created in an injection context, such as a page's
 * facade.
 */
@Injectable({ providedIn: 'root' })
export class ServicesClient {
  private readonly http = inject(HttpClient);

  servicesResource(): HttpResourceRef<IService[] | undefined> {
    return httpResource<IService[]>(() => '/api/services');
  }

  create$(service: IServiceRequest, context?: HttpContext): Observable<IService> {
    return this.http.post<IService>('/api/services', service, { context });
  }

  update$(id: string, service: IServiceRequest, context?: HttpContext): Observable<IService> {
    return this.http.put<IService>(`/api/services/${id}`, service, { context });
  }

  delete$(id: string, context?: HttpContext): Observable<void> {
    return this.http.delete<void>(`/api/services/${id}`, { context });
  }
}

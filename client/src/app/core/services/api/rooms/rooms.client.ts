import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IRoom } from '../../../entities/rooms/room.dto';

/**
 * The rooms endpoints of the API. Resources must be created in an injection context, such as a page's facade, and
 * live as long as it does.
 */
@Injectable({ providedIn: 'root' })
export class RoomsClient {
  roomsResource(): HttpResourceRef<IRoom[] | undefined> {
    return httpResource<IRoom[]>(() => '/api/rooms');
  }
}

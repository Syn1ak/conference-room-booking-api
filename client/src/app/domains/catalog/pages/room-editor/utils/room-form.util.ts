import { IRoom, IRoomRequest } from '../../../../../core/entities/rooms/room.dto';
import { IService } from '../../../../../core/entities/services/service.dto';
import { TRoomForm } from '../models/room-form.types';

/** Whether a price field holds a price, rather than being left empty. */
export function hasPrice(price: number | null | undefined): price is number {
  return price !== null && price !== undefined && !Number.isNaN(price);
}

/**
 * The form for a room, or for a new one: every catalog service is listed, ticked when the room offers it. A room's
 * own price is kept only where it differs from the standard price.
 */
export function toRoomForm(room: IRoom | null, catalog: IService[]): TRoomForm {
  const offered = new Map(
    (room?.services ?? []).map((service) => [service.serviceId, service.price]),
  );

  return {
    name: room?.name ?? '',
    capacity: room?.capacity ?? 10,
    hourlyPrice: room?.hourlyPrice ?? 1000,
    services: catalog.map((service) => {
      const price = offered.get(service.id);

      return {
        serviceId: service.id,
        name: service.name,
        standardPrice: service.standardPrice,
        offered: offered.has(service.id),
        price: price !== undefined && price !== service.standardPrice ? price : null,
      };
    }),
  };
}

/** The complete new state of the room, as the API takes it. An empty price sends none: the standard one applies. */
export function toRoomRequest(form: TRoomForm): IRoomRequest {
  return {
    name: form.name.trim(),
    capacity: form.capacity,
    hourlyPrice: form.hourlyPrice,
    services: form.services
      .filter((service) => service.offered)
      .map((service) =>
        hasPrice(service.price)
          ? { serviceId: service.serviceId, price: service.price }
          : { serviceId: service.serviceId },
      ),
  };
}

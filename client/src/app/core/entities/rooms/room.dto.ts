/** A catalog service a room offers, at the price this room charges for it once per booking. */
export interface IOfferedService {
  serviceId: string;
  name: string;
  price: number;
}

/** A conference room with the services it offers. */
export interface IRoom {
  id: string;
  name: string;
  capacity: number;
  hourlyPrice: number;
  services: IOfferedService[];
}

/** A room that is free for a searched time, with what renting it for that time costs before services. */
export interface IAvailableRoom extends IRoom {
  rentalPrice: number;
}

/** A room to add, or the complete new state of an existing one. Services left out stop being offered. */
export interface IRoomRequest {
  name: string;
  capacity: number;
  hourlyPrice: number;
  /** A missing price means the service's standard price. */
  services: { serviceId: string; price?: number }[];
}

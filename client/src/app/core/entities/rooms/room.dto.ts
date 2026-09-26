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

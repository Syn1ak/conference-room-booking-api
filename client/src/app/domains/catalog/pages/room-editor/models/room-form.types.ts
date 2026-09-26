/** One catalog service in the room form: whether the room offers it, and at what price. */
export type TOfferedServiceForm = {
  serviceId: string;
  name: string;
  standardPrice: number;
  offered: boolean;
  /** The room's own price; empty means the service's standard price. */
  price: number | null;
};

export type TRoomForm = {
  name: string;
  capacity: number;
  hourlyPrice: number;
  services: TOfferedServiceForm[];
};

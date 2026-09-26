import { TTimeBandKind } from '../venue/venue.dto';

export type TBookingStatus = 'Confirmed' | 'Cancelled';

export interface ICreateBookingRequest {
  roomId: string;
  /** ISO times with an offset. */
  start: string;
  end: string;
  attendeeCount: number;
  serviceIds: string[];
}

/** A service included in a booking, at the name and price saved with it. */
export interface IBookedService {
  serviceId: string;
  name: string;
  price: number;
}

/** The part of the room rental that falls into one time band. */
export interface IRentalLine {
  band: TTimeBandKind;
  start: string;
  end: string;
  hours: number;
  multiplier: number;
  amount: number;
}

/** A booking that was just made, with the full breakdown of its price. */
export interface IBookingConfirmation {
  id: string;
  roomId: string;
  clientId: string;
  start: string;
  end: string;
  durationMinutes: number;
  attendeeCount: number;
  roomHourlyPrice: number;
  rentalLines: IRentalLine[];
  services: IBookedService[];
  rentalPrice: number;
  totalPrice: number;
}

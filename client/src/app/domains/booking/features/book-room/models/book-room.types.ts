import { IBookingConfirmation } from '../../../../../core/entities/bookings/booking.dto';
import { IAvailableRoom } from '../../../../../core/entities/rooms/room.dto';

/** What the booking dialog books: a room found by a search, for the searched slot. */
export type TBookRoomData = {
  room: IAvailableRoom;
  /** Venue-local date and times of the slot. */
  date: string;
  from: string;
  to: string;
  /** How many people the search was for; the attendee count starts there. */
  capacity: number;
  /** Refreshes the search results behind the dialog, when they turn out to be out of date. */
  refreshResults: () => void;
};

/** How the dialog ended: with a booking, or closed without one. */
export type TBookRoomResult = { booking: IBookingConfirmation } | undefined;

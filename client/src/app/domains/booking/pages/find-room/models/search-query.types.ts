/** What a visitor searches for: a venue-local date and times, and how many people the room must hold. */
export type TSearchQuery = {
  date: string;
  from: string;
  to: string;
  capacity: number;
};

/** The search as it arrives in the query string, where any value may be missing or malformed. */
export type TRawSearchQuery = {
  date?: string | null;
  from?: string | null;
  to?: string | null;
  capacity?: string | null;
};

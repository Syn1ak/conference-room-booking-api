import { TRole } from '../entities/auth/auth.dto';

/** Where each kind of user starts: clients find rooms, admins see the bookings. */
export function homeUrl(role: TRole | null): string {
  return role === 'Admin' ? '/bookings' : '/';
}

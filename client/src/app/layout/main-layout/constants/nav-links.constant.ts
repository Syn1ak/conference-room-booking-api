import { TRole } from '../../../core/entities/auth/auth.dto';

export type TNavLink = {
  label: string;
  path: string;
  /** Only the exact path marks the link active, so "Find a room" at / isn't active everywhere. */
  exact: boolean;
};

const VISITOR_LINKS: TNavLink[] = [
  { label: 'Find a room', path: '/', exact: true },
  { label: 'Rooms', path: '/rooms', exact: false },
];

/** The main navigation for each kind of user. */
export const NAV_LINKS: Record<TRole | 'Visitor', TNavLink[]> = {
  Visitor: VISITOR_LINKS,
  Client: [...VISITOR_LINKS, { label: 'My bookings', path: '/bookings', exact: false }],
  Admin: [
    { label: 'Bookings', path: '/bookings', exact: false },
    { label: 'Rooms', path: '/admin/rooms', exact: false },
    { label: 'Services', path: '/admin/services', exact: false },
    { label: 'Reports', path: '/admin/reports', exact: false },
  ],
};

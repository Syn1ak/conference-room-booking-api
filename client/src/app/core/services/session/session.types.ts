import { TRole } from '../../entities/auth/auth.dto';

export type TSessionUser = {
  id: string;
  email: string;
  role: TRole;
};

export type TSession = {
  accessToken: string;
  /** When the access token stops working, as an ISO time. */
  expiresAt: string;
  user: TSessionUser;
};

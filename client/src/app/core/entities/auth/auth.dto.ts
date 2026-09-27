export type TRole = 'Admin' | 'Client';

export interface ICredentials {
  email: string;
  password: string;
}

export interface ILoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
}

export interface IRegisterResponse {
  userId: string;
  email: string;
}

export interface ICurrentUser {
  userId: string;
  email: string;
  roles: string[];
}

/** An account anyone may sign in with to try the app; its password is public by design. */
export interface IDemoAccount {
  label: string;
  email: string;
  password: string;
  role: TRole;
}

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

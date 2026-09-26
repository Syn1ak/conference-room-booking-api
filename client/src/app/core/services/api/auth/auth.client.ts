import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ICredentials,
  ICurrentUser,
  ILoginResponse,
  IRegisterResponse,
} from '../../../entities/auth/auth.dto';

/** The authentication endpoints of the API. */
@Injectable({ providedIn: 'root' })
export class AuthClient {
  private readonly http = inject(HttpClient);

  register$(credentials: ICredentials, context?: HttpContext): Observable<IRegisterResponse> {
    return this.http.post<IRegisterResponse>('/api/auth/register', credentials, { context });
  }

  login$(credentials: ICredentials, context?: HttpContext): Observable<ILoginResponse> {
    return this.http.post<ILoginResponse>('/api/auth/login', credentials, { context });
  }

  /** The account a token belongs to. Takes the token explicitly, since it isn't part of the session yet. */
  me$(accessToken: string): Observable<ICurrentUser> {
    return this.http.get<ICurrentUser>('/api/auth/me', {
      headers: new HttpHeaders({ Authorization: `Bearer ${accessToken}` }),
    });
  }
}

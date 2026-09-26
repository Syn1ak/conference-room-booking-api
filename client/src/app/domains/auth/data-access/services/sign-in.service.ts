import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ICredentials, TRole } from '../../../../core/entities/auth/auth.dto';
import { SKIP_ERROR_TOAST } from '../../../../core/interceptors/error.interceptor';
import { AuthClient } from '../../../../core/services/api/auth/auth.client';
import { SessionStore } from '../../../../core/services/session/session.store';

/** The auth pages show every failure inline, so the global error toasts stay quiet. */
const INLINE_ERRORS = new HttpContext().set(SKIP_ERROR_TOAST, true);

/**
 * Signs users in and registers them. Both end with a started session, so the user is signed in right away.
 */
@Injectable({ providedIn: 'root' })
export class SignInService {
  private readonly auth = inject(AuthClient);
  private readonly session = inject(SessionStore);

  /** Signs in and returns the user's role. Rejects with the HTTP error on failure. */
  async signIn(credentials: ICredentials): Promise<TRole> {
    const login = await firstValueFrom(this.auth.login$(credentials, INLINE_ERRORS));
    const user = await firstValueFrom(this.auth.me$(login.accessToken));
    const role: TRole = user.roles.includes('Admin') ? 'Admin' : 'Client';

    this.session.start({
      accessToken: login.accessToken,
      expiresAt: login.expiresAt,
      user: { id: user.userId, email: user.email, role },
    });

    return role;
  }

  /** Creates a client account and signs in with it. Rejects with the HTTP error on failure. */
  async register(credentials: ICredentials): Promise<TRole> {
    await firstValueFrom(this.auth.register$(credentials, INLINE_ERRORS));

    return this.signIn(credentials);
  }
}

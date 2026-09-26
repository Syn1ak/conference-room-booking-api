import { TSession } from '../services/session/session.types';

/** A session that stays valid for an hour from now, for tests. */
export function testSession(overrides: Partial<TSession['user']> = {}): TSession {
  return {
    accessToken: 'test-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: { id: 'user-1', email: 'client@example.test', role: 'Client', ...overrides },
  };
}

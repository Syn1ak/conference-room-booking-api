import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** A port of its own, so end-to-end runs never reuse the development servers or database. */
export const APP_PORT = 5299;
export const APP_URL = `http://localhost:${APP_PORT}`;

export const E2E_DATABASE = 'ConferenceRoomBookingE2E';

/** Test-only admin account. It exists only in the throwaway end-to-end database. */
export const E2E_ADMIN = { email: 'admin@e2e.test', password: 'E2e-Admin-Pass1!' };

const envFile = resolve(__dirname, '../../../.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const saPassword = process.env['MSSQL_SA_PASSWORD'];
if (!saPassword) {
  throw new Error(
    'MSSQL_SA_PASSWORD is missing: create .env from .env.example and run `docker compose up -d`.',
  );
}

const sqlPort = process.env['MSSQL_PORT'] ?? '1433';

/** Settings for the API under test. They override user-secrets, so the run doesn't depend on the developer's. */
export const apiEnvironment: Record<string, string> = {
  // Development migrates the fresh database at startup; deployments migrate as a separate step instead. The published
  // client and its security headers are the same in every environment.
  ASPNETCORE_ENVIRONMENT: 'Development',
  ASPNETCORE_URLS: APP_URL,
  ConnectionStrings__DefaultConnection:
    `Server=localhost,${sqlPort};Database=${E2E_DATABASE};User Id=sa;Password=${saPassword};` +
    'TrustServerCertificate=True',
  Jwt__SigningKey: randomBytes(48).toString('base64'),
  AdminAccount__Email: E2E_ADMIN.email,
  AdminAccount__Password: E2E_ADMIN.password,
  // Parallel tests register many accounts from one address; the limits themselves are covered by the API's tests.
  RateLimiting__GlobalPermitLimit: '100000',
  RateLimiting__AuthenticationPermitLimit: '100000',
  MSSQL_SA_PASSWORD: saPassword,
};

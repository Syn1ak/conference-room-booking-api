import { defineConfig, devices } from '@playwright/test';
import { API_PORT, apiEnvironment, APP_URL, CLIENT_PORT } from './e2e/support/e2e-environment';

/**
 * End-to-end tests against the real API and SQL Server. The API runs on its own port with its own database, which is
 * dropped and migrated again at the start of each run.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: APP_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    timezoneId: 'Europe/Kyiv',
    locale: 'en-GB',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'API',
      command:
        'node e2e/support/reset-database.mjs && ' +
        'dotnet run --project ../src/ConferenceRoomBooking.Api --no-launch-profile',
      url: `http://localhost:${API_PORT}/health`,
      env: apiEnvironment,
      timeout: 240_000,
      reuseExistingServer: !process.env['CI'],
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      name: 'Client',
      command: `npx ng serve --port ${CLIENT_PORT} --proxy-config e2e/proxy.e2e.json`,
      url: APP_URL,
      timeout: 240_000,
      reuseExistingServer: !process.env['CI'],
    },
  ],
});

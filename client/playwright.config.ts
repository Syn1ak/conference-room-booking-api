import { defineConfig, devices } from '@playwright/test';
import { apiEnvironment, APP_URL } from './e2e/support/e2e-environment';

/**
 * End-to-end tests against the app as it's deployed: the published API serving the built client, on its own port, with
 * its own SQL Server database, which is dropped at the start of each run.
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
  webServer: {
    name: 'App',
    command: 'e2e/support/serve-published.sh',
    url: `${APP_URL}/health`,
    env: apiEnvironment,
    timeout: 360_000,
    reuseExistingServer: !process.env['CI'],
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

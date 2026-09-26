import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test as base } from '@playwright/test';
import { Api, TAccount } from './api';

type TFixtures = {
  api: Api;
  /** Collects console errors and failed requests; a test fails if any appear that it didn't expect. */
  consoleErrors: string[];
};

export const test = base.extend<TFixtures>({
  api: async ({ request }, use) => {
    await use(new Api(request));
  },
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await use(errors);
  },
});

export { expect };

/**
 * Signs the page in as the account before the app starts, the way a signed-in session survives a reload.
 */
export async function signIn(page: Page, account: TAccount): Promise<void> {
  await page.addInitScript(
    (session) => sessionStorage.setItem('crb.session', JSON.stringify(session)),
    {
      accessToken: account.token,
      expiresAt: account.expiresAt,
      user: { id: account.userId, email: account.email, role: account.role },
    },
  );
}

/** Fails on accessibility violations that block or seriously hinder people. */
export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(
    serious.map(
      (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`,
    ),
  ).toEqual([]);
}

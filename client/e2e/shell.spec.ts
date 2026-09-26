import { expect, expectNoSeriousA11yViolations, signIn, test } from './support/fixtures';

test.describe('app shell', () => {
  test('loads for a visitor without errors', async ({ page, consoleErrors }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();
    await expect(page.getByRole('contentinfo')).toContainText('Europe/Kyiv');
    expect(consoleErrors).toEqual([]);
    await expectNoSeriousA11yViolations(page);
  });

  test('shows staff the management navigation', async ({ page, api }) => {
    await signIn(page, await api.loginAdmin());

    await page.goto('/');

    const navigation = page.getByRole('navigation', { name: 'Main' });
    await expect(navigation.getByRole('link')).toHaveText([
      'Bookings',
      'Rooms',
      'Services',
      'Reports',
    ]);
    await expect(page.getByRole('button', { name: 'Account: admin@e2e.test' })).toBeVisible();
  });

  test('sends a client to the no-access page', async ({ page, api }) => {
    await signIn(page, await api.registerClient());

    await page.goto('/no-access');

    await expect(
      page.getByRole('heading', { name: "You don't have access to this page" }),
    ).toBeVisible();
  });
});

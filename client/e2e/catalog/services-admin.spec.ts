import { expect, signIn, test } from '../support/fixtures';

test.describe('services admin', () => {
  test('staff see the catalog of services', async ({ page, api }) => {
    await signIn(page, await api.loginAdmin());

    await page.goto('/admin/services');

    await expect(page.getByRole('rowheader', { name: 'Projector' })).toBeVisible();
    await expect(page.getByRole('row', { name: /Projector/ })).toContainText('500.00 UAH');
  });

  test('clients get the no-access page', async ({ page, api }) => {
    await signIn(page, await api.registerClient());

    await page.goto('/admin/services');

    await expect(page).toHaveURL('/no-access');
  });
});

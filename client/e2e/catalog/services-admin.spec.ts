import { uniqueName } from '../support/api';
import { expect, signIn, test } from '../support/fixtures';

test.describe('services admin', () => {
  test('staff see the catalog of services', async ({ page, api }) => {
    await signIn(page, await api.loginAdmin());

    await page.goto('/admin/services');

    await expect(page.getByRole('rowheader', { name: 'Projector' })).toBeVisible();
    await expect(page.getByRole('row', { name: /Projector/ })).toContainText('500.00 UAH');
  });

  test('staff add a service and rename it', async ({ page, api }) => {
    await signIn(page, await api.loginAdmin());
    const name = uniqueName('Coffee');
    await page.goto('/admin/services');

    await page.getByRole('button', { name: 'Add service' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a service' });
    await expect(dialog.getByLabel('Name')).toBeFocused();
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByLabel('Standard price, UAH').fill('250.5');
    await dialog.getByRole('button', { name: 'Add service' }).click();
    await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('250.50 UAH');

    await page.getByRole('button', { name: `Edit ${name}` }).click();
    await page.getByRole('dialog').getByLabel('Name').fill(`${name} deluxe`);
    await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('rowheader', { name: `${name} deluxe` })).toBeVisible();
  });

  test('a name that differs only in case is taken', async ({ page, api }) => {
    await signIn(page, await api.loginAdmin());
    await page.goto('/admin/services');

    await page.getByRole('button', { name: 'Add service' }).click();
    await page.getByRole('dialog').getByLabel('Name').fill('pROJECTOR');
    await page.getByRole('dialog').getByLabel('Standard price, UAH').fill('10');
    await page.getByRole('dialog').getByRole('button', { name: 'Add service' }).click();

    await expect(
      page.getByRole('dialog').getByText('A service with this name already exists.'),
    ).toBeVisible();
  });

  test('clients get the no-access page', async ({ page, api }) => {
    await signIn(page, await api.registerClient());

    await page.goto('/admin/services');

    await expect(page).toHaveURL('/no-access');
  });
});

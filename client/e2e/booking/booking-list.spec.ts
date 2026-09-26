import { uniqueName } from '../support/api';
import { expect, signIn, test } from '../support/fixtures';
import { futureDate, slot } from '../support/slots';

test.describe('bookings list', () => {
  test("a client sees only their own bookings, and staff see everyone's", async ({
    browser,
    api,
  }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('List'), capacity: 10 });
    const ann = await api.registerClient();
    const bob = await api.registerClient();
    // Later than any other test's bookings, so they head the staff list, which starts with the latest.
    const date = futureDate(360);
    await api.book(ann, { roomId: room.id, ...slot(date, '09:00', '10:00') });
    await api.book(bob, { roomId: room.id, ...slot(date, '10:00', '11:00') });

    const annPage = await (await browser.newContext()).newPage();
    await signIn(annPage, ann);
    await annPage.goto('/bookings');
    const annRows = annPage.getByRole('listitem').filter({ hasText: room.name });
    await expect(annRows).toHaveCount(1);
    await expect(annRows).toContainText('09:00–10:00');

    const adminPage = await (await browser.newContext()).newPage();
    await signIn(adminPage, admin);
    await adminPage.goto('/bookings');
    const adminRows = adminPage.getByRole('listitem').filter({ hasText: room.name });
    await expect(adminRows).toHaveCount(2);
    await expect(adminRows.filter({ hasText: `Client ${ann.userId.slice(0, 8)}` })).toHaveCount(1);
    await expect(adminRows.filter({ hasText: `Client ${bob.userId.slice(0, 8)}` })).toHaveCount(1);
  });

  test('pages through twelve bookings', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Paging'), capacity: 10 });
    const client = await api.registerClient();
    for (let day = 0; day < 12; day++) {
      await api.book(client, { roomId: room.id, ...slot(futureDate(10 + day), '10:00', '11:00') });
    }

    await signIn(page, client);
    await page.goto('/bookings');
    await expect(page.getByRole('listitem')).toHaveCount(10);
    await expect(page.getByText('Page 1 of 2')).toBeVisible();

    await page.getByRole('link', { name: /Next/ }).click();
    await expect(page).toHaveURL('/bookings?page=2');
    await expect(page.getByRole('listitem')).toHaveCount(2);

    await page.goto('/bookings?page=7');
    await expect(page).toHaveURL('/bookings?page=2');
  });

  test('sends visitors to sign in first', async ({ page }) => {
    await page.goto('/bookings');

    await expect(page).toHaveURL('/login?returnUrl=%2Fbookings');
  });
});

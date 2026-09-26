import { uniqueName } from '../support/api';
import { expect, signIn, test } from '../support/fixtures';
import { futureDate, randomFutureDate, slot } from '../support/slots';

test.describe('bookings list', () => {
  test("a client sees only their own bookings, and staff see everyone's", async ({
    browser,
    api,
  }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('List'), capacity: 10 });
    const ann = await api.registerClient();
    const bob = await api.registerClient();
    const date = randomFutureDate();
    const annBooking = await api.book(ann, { roomId: room.id, ...slot(date, '09:00', '10:00') });
    const bobBooking = await api.book(bob, { roomId: room.id, ...slot(date, '10:00', '11:00') });

    const annPage = await (await browser.newContext()).newPage();
    await signIn(annPage, ann);
    await annPage.goto('/bookings');
    const annRows = annPage.getByRole('listitem').filter({ hasText: room.name });
    await expect(annRows).toHaveCount(1);
    await expect(annRows).toContainText('09:00–10:00');

    // Staff can open either client's booking; the list's position of them depends on everyone else's bookings.
    const adminPage = await (await browser.newContext()).newPage();
    await signIn(adminPage, admin);
    for (const [booking, client] of [
      [annBooking, ann],
      [bobBooking, bob],
    ] as const) {
      await adminPage.goto(`/bookings/${booking.id}`);
      await expect(adminPage.getByRole('heading', { name: room.name })).toBeVisible();
      await expect(adminPage.getByText(client.userId)).toBeVisible();
    }
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

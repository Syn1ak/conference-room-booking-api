import { uniqueName } from '../support/api';
import { expect, signIn, test } from '../support/fixtures';
import { randomFutureDate } from '../support/slots';

test.describe('booking a room', () => {
  test('a client books a room with services, and the room stops being free', async ({
    page,
    api,
  }) => {
    const admin = await api.loginAdmin();
    const services = await api.services();
    const projector = services.find((service) => service.name === 'Projector')!;
    const wifi = services.find((service) => service.name === 'Wi-Fi')!;
    const room = await api.createRoom(admin, {
      name: uniqueName('Book'),
      capacity: 30,
      hourlyPrice: 2000,
      services: [{ serviceId: projector.id }, { serviceId: wifi.id }],
    });
    await signIn(page, await api.registerClient());
    const date = randomFutureDate();

    await page.goto(`/?date=${date}&from=11:00&to=15:00&capacity=10`);
    const card = page.locator('app-available-room-card', {
      has: page.getByRole('heading', { name: room.name }),
    });
    await card.getByRole('button', { name: 'Book' }).click();

    const dialog = page.getByRole('dialog', { name: `Book ${room.name}` });
    await dialog.getByRole('checkbox', { name: /Projector/ }).check();
    await dialog.getByRole('checkbox', { name: /Wi-Fi/ }).check();
    await dialog.getByRole('button', { name: 'Book for 9,400.00 UAH' }).click();

    // The worked example of ADR 0004: 11:00–15:00 in a 2000 UAH/h room with a projector and Wi-Fi.
    await expect(dialog.getByRole('heading', { name: "You're booked" })).toBeVisible();
    const rows = dialog.getByRole('row');
    await expect(rows.nth(1)).toContainText('Standard');
    await expect(rows.nth(1)).toContainText('2,000.00 UAH');
    await expect(rows.nth(2)).toContainText('Peak');
    await expect(rows.nth(2)).toContainText('×1.15');
    await expect(rows.nth(2)).toContainText('4,600.00 UAH');
    await expect(rows.nth(3)).toContainText('2,000.00 UAH');
    await expect(dialog.getByRole('row', { name: /Total/ })).toContainText('9,400.00 UAH');

    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toBeHidden();
    await expect(card).toHaveCount(0);
  });

  test('a double click books once', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Double'), capacity: 5 });
    const client = await api.registerClient();
    await signIn(page, client);
    await page.route('**/api/bookings', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });

    await page.goto(`/?date=${randomFutureDate()}&from=16:00&to=17:00&capacity=2`);
    const card = page.locator('app-available-room-card', {
      has: page.getByRole('heading', { name: room.name }),
    });
    await card.getByRole('button', { name: 'Book' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Book for/ })
      .dblclick();

    await expect(page.getByRole('heading', { name: "You're booked" })).toBeVisible();
    const { items } = await api.bookings(client);
    expect(items.filter((booking) => booking.roomId === room.id)).toHaveLength(1);
  });

  test('a visitor is asked to sign in and comes back to the same search', async ({ page, api }) => {
    const client = await api.registerClient();
    const date = randomFutureDate();
    await page.goto(`/?date=${date}&from=09:00&to=10:00&capacity=2`);

    await page.getByRole('link', { name: 'Sign in to book' }).first().click();
    await page.getByLabel('Email').fill(client.email);
    await page.getByLabel('Password', { exact: true }).fill(client.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(`/?date=${date}&from=09:00&to=10:00&capacity=2`);
    await expect(page.getByRole('button', { name: 'Book' }).first()).toBeVisible();
  });
});

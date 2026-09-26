import { uniqueName } from '../support/api';
import { expect, signIn, test } from '../support/fixtures';
import { randomFutureDate, slot } from '../support/slots';

test.describe('room editor', () => {
  test('staff add a room with its own service price, and clients see it in the catalogue', async ({
    page,
    api,
  }) => {
    const admin = await api.loginAdmin();
    const service = await api.createService(admin, { standardPrice: 400 });
    const name = uniqueName('New');
    await signIn(page, admin);
    await page.goto('/admin/rooms');

    await page.getByRole('link', { name: 'Add room' }).click();
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Capacity').fill('14');
    await page.getByLabel('Hourly price, UAH').fill('1800');
    await page.getByRole('checkbox', { name: service.name }).check();
    await page.getByLabel(`Price of ${service.name} in this room, UAH`).fill('350');
    await page.getByRole('button', { name: 'Add room' }).click();

    await expect(page).toHaveURL('/admin/rooms');
    await expect(page.getByText(`${name} added`)).toBeVisible();
    await page.goto('/rooms');
    const card = page.locator('app-room-card', { has: page.getByRole('heading', { name }) });
    await expect(card).toContainText('Up to 14 people');
    await expect(card).toContainText('1,800.00 UAH');
    await expect(card).toContainText('350.00 UAH');
  });

  test('a new price changes searches but not bookings already made', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, {
      name: uniqueName('Reprice'),
      capacity: 5,
      hourlyPrice: 1000,
    });
    const client = await api.registerClient();
    const date = randomFutureDate();
    const booking = await api.book(client, { roomId: room.id, ...slot(date, '09:00', '10:00') });
    expect(booking.totalPrice).toBe(1000);
    await signIn(page, admin);

    await page.goto(`/admin/rooms/${room.id}/edit`);
    await page.getByLabel('Hourly price, UAH').fill('2000');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL('/admin/rooms');

    await page.goto(`/?date=${date}&from=10:00&to=11:00&capacity=5`);
    const card = page.locator('app-available-room-card', {
      has: page.getByRole('heading', { name: room.name }),
    });
    await expect(card).toContainText('2,000.00 UAH');
    const { items } = await api.bookings(client);
    expect(items.find((item) => item.id === booking.id)?.totalPrice).toBe(1000);
  });

  test('leaving with unsaved changes asks first', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Unsaved') });
    await signIn(page, admin);
    await page.goto(`/admin/rooms/${room.id}/edit`);

    await page.getByLabel('Capacity').fill('33');
    await page.getByRole('link', { name: 'All rooms' }).click();

    const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
    await dialog.getByRole('button', { name: 'Stay' }).click();
    await expect(page).toHaveURL(`/admin/rooms/${room.id}/edit`);
    await expect(page.getByLabel('Capacity')).toHaveValue('33');

    await page.getByRole('link', { name: 'All rooms' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Leave' }).click();
    await expect(page).toHaveURL('/admin/rooms');
  });
});

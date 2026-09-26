import { uniqueName } from '../support/api';
import { expect, signIn, test } from '../support/fixtures';
import { randomFutureDate, slot } from '../support/slots';

test.describe('cancelling a booking', () => {
  test('frees the slot, which shows up in the search again', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Cancel'), capacity: 6 });
    const client = await api.registerClient();
    const date = randomFutureDate();
    await api.book(client, { roomId: room.id, ...slot(date, '14:00', '16:00') });
    await signIn(page, client);

    await page.goto(`/?date=${date}&from=14:00&to=16:00&capacity=6`);
    await expect(page.getByRole('heading', { name: /free$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: room.name })).toHaveCount(0);

    await page.goto('/bookings');
    const row = page.getByRole('listitem').filter({ hasText: room.name });
    await row.getByRole('button', { name: `Cancel booking of ${room.name}` }).click();
    await page
      .getByRole('dialog', { name: 'Cancel this booking?' })
      .getByRole('button', { name: 'Cancel booking' })
      .click();
    await expect(page.getByText('Booking cancelled')).toBeVisible();
    await expect(row).toContainText('Cancelled');
    await expect(row.getByRole('button', { name: /^Cancel booking/ })).toHaveCount(0);

    await page.goto(`/?date=${date}&from=14:00&to=16:00&capacity=6`);
    await expect(page.getByRole('heading', { name: room.name })).toBeVisible();
  });

  test('keeping the booking changes nothing', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Keep'), capacity: 6 });
    const client = await api.registerClient();
    await api.book(client, { roomId: room.id, ...slot(randomFutureDate(), '14:00', '16:00') });
    await signIn(page, client);

    await page.goto('/bookings');
    const row = page.getByRole('listitem').filter({ hasText: room.name });
    await row.getByRole('button', { name: `Cancel booking of ${room.name}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Keep it' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(row).toContainText('Upcoming');
  });
});

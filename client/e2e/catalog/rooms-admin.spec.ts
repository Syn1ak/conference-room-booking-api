import { uniqueName } from '../support/api';
import { expect, signIn, test } from '../support/fixtures';
import { randomFutureDate, slot } from '../support/slots';

test.describe('rooms admin', () => {
  test('an unbooked room can be deleted, a booked one only edited', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const unbooked = await api.createRoom(admin, { name: uniqueName('Unbooked') });
    const booked = await api.createRoom(admin, { name: uniqueName('Booked') });
    await api.book(await api.registerClient(), {
      roomId: booked.id,
      ...slot(randomFutureDate(), '10:00', '11:00'),
    });
    await signIn(page, admin);
    await page.goto('/admin/rooms');

    await page.getByRole('button', { name: `Delete ${unbooked.name}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete room' }).click();
    await expect(page.getByText(`${unbooked.name} deleted`)).toBeVisible();
    await expect(page.getByRole('rowheader', { name: unbooked.name })).toHaveCount(0);

    await page.getByRole('button', { name: `Delete ${booked.name}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete room' }).click();
    await expect(page.getByText('It has bookings, which are kept for the records')).toBeVisible();
    await expect(page.getByRole('rowheader', { name: booked.name })).toBeVisible();
  });
});

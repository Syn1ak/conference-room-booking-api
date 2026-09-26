import { uniqueName } from '../support/api';
import { expect, signIn, test } from '../support/fixtures';
import { futureDate, slot } from '../support/slots';

test.describe('revenue report', () => {
  test("a room's bookings and cancellations show up in its row", async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, {
      name: uniqueName('Revenue'),
      capacity: 5,
      hourlyPrice: 1000,
    });
    const client = await api.registerClient();
    const date = futureDate(40);
    await api.book(client, { roomId: room.id, ...slot(date, '09:00', '11:00') });
    const cancelled = await api.book(client, { roomId: room.id, ...slot(date, '15:00', '16:00') });
    await api.cancel(client, cancelled);
    await signIn(page, admin);

    await page.goto(`/admin/reports?from=${date}&to=${date}`);

    const row = page.getByRole('row', { name: new RegExp(room.name) });
    const cells = row.getByRole('cell');
    await expect(cells.nth(0)).toHaveText('1');
    await expect(cells.nth(3)).toHaveText('2,000.00 UAH');
    await expect(cells.nth(4)).toHaveText('1');
  });
});

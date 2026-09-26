import { uniqueName } from '../support/api';
import { expect, signIn, test } from '../support/fixtures';
import { futureDate, slot } from '../support/slots';

test.describe('occupancy report', () => {
  test("a room's booked hours show against its opening hours", async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Occupancy'), capacity: 10 });
    const date = futureDate(50);
    await api.book(await api.registerClient(), {
      roomId: room.id,
      ...slot(date, '06:00', '14:30'),
      attendeeCount: 5,
    });
    await signIn(page, admin);

    await page.goto(`/admin/reports?from=${date}&to=${date}&report=occupancy`);

    // 8.5 of 17 open hours, with 5 people in a room for 10.
    const row = page.getByRole('row', { name: new RegExp(room.name) });
    await expect(row).toContainText('50%');
    await expect(row).toContainText('8.5 h');
  });
});

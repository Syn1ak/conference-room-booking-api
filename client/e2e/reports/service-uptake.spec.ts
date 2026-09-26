import { expect, signIn, test } from '../support/fixtures';
import { futureDate, slot } from '../support/slots';

test.describe('service uptake report', () => {
  test('a booked service shows with its revenue', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const service = await api.createService(admin, { standardPrice: 123 });
    const room = await api.createRoom(admin, { services: [{ serviceId: service.id }] });
    const date = futureDate(70);
    await api.book(await api.registerClient(), {
      roomId: room.id,
      ...slot(date, '10:00', '11:00'),
      serviceIds: [service.id],
    });
    await signIn(page, admin);

    await page.goto(`/admin/reports?from=${date}&to=${date}&report=services`);

    const row = page.getByRole('row', { name: new RegExp(service.name) });
    await expect(row.getByRole('cell').first()).toHaveText('1');
    await expect(row).toContainText('123.00 UAH');
  });
});

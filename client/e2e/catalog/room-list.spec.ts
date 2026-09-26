import { uniqueName } from '../support/api';
import { expect, test } from '../support/fixtures';

test.describe('room catalogue', () => {
  test('shows a new room with its services and a link to check it', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const service = await api.createService(admin, { standardPrice: 450 });
    const room = await api.createRoom(admin, {
      name: uniqueName('Catalogue'),
      capacity: 12,
      hourlyPrice: 1234.5,
      services: [{ serviceId: service.id, price: 99.9 }],
    });

    await page.goto('/rooms');

    const card = page.locator('app-room-card', {
      has: page.getByRole('heading', { name: room.name }),
    });
    await expect(card).toContainText('Up to 12 people');
    await expect(card).toContainText('1,234.50 UAH');
    await expect(card).toContainText(service.name);
    await expect(card).toContainText('99.90 UAH');

    await card.getByRole('link', { name: /Check availability/ }).click();
    await expect(page).toHaveURL('/?capacity=12');
  });
});

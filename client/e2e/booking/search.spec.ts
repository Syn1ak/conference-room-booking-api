import { uniqueName } from '../support/api';
import { expect, test } from '../support/fixtures';
import { randomFutureDate, slot } from '../support/slots';

test.describe('searching for rooms', () => {
  test('a booked slot hides the room, and a back-to-back slot shows it', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, {
      name: uniqueName('Search'),
      capacity: 8,
      hourlyPrice: 1000,
    });
    const client = await api.registerClient();
    const date = randomFutureDate();
    await api.book(client, { roomId: room.id, ...pick(slot(date, '10:00', '12:00')) });

    await page.goto(`/?date=${date}&from=10:00&to=12:00&capacity=8`);
    await expect(page.getByRole('heading', { name: /free$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: room.name })).toHaveCount(0);

    await page.getByLabel('From').selectOption('12:00');
    await page.getByLabel('To').selectOption('14:00');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page).toHaveURL(new RegExp(`from=12:00&to=14:00`));
    const card = page.locator('app-available-room-card', {
      has: page.getByRole('heading', { name: room.name }),
    });
    // 2 hours at peak: 2 × 1000 × 1.15.
    await expect(card).toContainText('2,300.00 UAH');
    await expect(card.getByText('Peak')).toBeVisible();
  });

  test('back and forward restore earlier searches', async ({ page }) => {
    const date = randomFutureDate();
    await page.goto(`/?date=${date}&from=09:00&to=10:00&capacity=2`);

    await page.getByLabel('To').selectOption('11:00');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL(/to=11:00/);

    await page.goBack();
    await expect(page.getByLabel('To')).toHaveValue('10:00');

    await page.goForward();
    await expect(page.getByLabel('To')).toHaveValue('11:00');
  });
});

function pick({ start, end }: { start: string; end: string }) {
  return { start, end };
}

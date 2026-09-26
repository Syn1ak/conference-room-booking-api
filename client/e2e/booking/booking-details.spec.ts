import { uniqueName } from '../support/api';
import { expect, signIn, test } from '../support/fixtures';
import { randomFutureDate, slot } from '../support/slots';

test.describe('booking details', () => {
  test('a client opens a booking from the list and sees its saved prices', async ({
    page,
    api,
  }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, {
      name: uniqueName('Details'),
      capacity: 8,
      hourlyPrice: 1000,
    });
    const client = await api.registerClient();
    await api.book(client, {
      roomId: room.id,
      ...slot(randomFutureDate(), '09:00', '11:00'),
      attendeeCount: 3,
    });
    await signIn(page, client);

    await page.goto('/bookings');
    await page.getByRole('link', { name: room.name }).click();

    await expect(page).toHaveURL(/\/bookings\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: room.name })).toBeVisible();
    await expect(page.getByText('3 people')).toBeVisible();
    // 2 hours at the standard rate.
    await expect(page.getByText('2,000.00 UAH').first()).toBeVisible();
  });

  test("another client's booking is not found, as if it didn't exist", async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Private'), capacity: 8 });
    const ann = await api.registerClient();
    const booking = await api.book(ann, {
      roomId: room.id,
      ...slot(randomFutureDate(), '09:00', '10:00'),
    });
    await signIn(page, await api.registerClient());

    await page.goto(`/bookings/${booking.id}`);

    await expect(page.getByRole('heading', { name: 'Booking not found' })).toBeVisible();
    await expect(page.getByText(room.name)).toHaveCount(0);
  });

  test('a malformed id is not found either', async ({ page, api }) => {
    await signIn(page, await api.registerClient());

    await page.goto('/bookings/not-a-booking');

    await expect(page.getByRole('heading', { name: 'Booking not found' })).toBeVisible();
  });
});

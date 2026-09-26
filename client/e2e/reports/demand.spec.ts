import { uniqueName } from '../support/api';
import { expect, signIn, test } from '../support/fixtures';
import { futureDate, slot } from '../support/slots';

test.describe('demand report', () => {
  test('a peak-hour booking shows in Peak on its weekday', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Demand') });
    const date = futureDate(60);
    await api.book(await api.registerClient(), {
      roomId: room.id,
      ...slot(date, '12:00', '14:00'),
    });
    await signIn(page, admin);

    await page.goto(`/admin/reports?from=${date}&to=${date}&report=demand`);

    // Other tests book on random dates, so the day may hold more peak hours than this one booking.
    const weekday = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
      weekday: 'short',
      timeZone: 'UTC',
    });
    const peakBand = page.getByRole('listitem').filter({ hasText: 'Peak' });
    await expect(peakBand).toContainText(/· [1-9][\d.,]* h of/);
    const peakCell = page
      .getByRole('row', { name: new RegExp(weekday) })
      .getByRole('cell')
      .nth(2);
    await expect(peakCell).toContainText(/, [1-9][\d.,]* h of/);
  });
});

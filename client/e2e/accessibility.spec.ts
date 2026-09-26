import { Page } from '@playwright/test';
import { TAccount, uniqueName } from './support/api';
import { expect, expectNoSeriousA11yViolations, signIn, test } from './support/fixtures';
import { futureDate, slot } from './support/slots';

type TRole = 'visitor' | 'client' | 'admin';

const SEARCH = `/?date=${futureDate(90)}&from=11:00&to=15:00&capacity=4`;

const PAGES: Record<TRole, string[]> = {
  visitor: ['/', SEARCH, '/rooms', '/login', '/register', '/nowhere'],
  client: [SEARCH, '/bookings', '/no-access'],
  admin: [
    '/bookings',
    '/admin/rooms',
    '/admin/rooms/new',
    '/admin/services',
    '/admin/reports',
    '/admin/reports?report=occupancy',
    '/admin/reports?report=demand',
    '/admin/reports?report=services',
  ],
};

async function useTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((value) => localStorage.setItem('crb.theme', value), theme);
}

async function accountFor(
  role: TRole,
  api: { registerClient(): Promise<TAccount>; loginAdmin(): Promise<TAccount> },
) {
  return role === 'visitor' ? null : role === 'client' ? api.registerClient() : api.loginAdmin();
}

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const role of Object.keys(PAGES) as TRole[]) {
      test(`${role} pages have no serious issues in the ${theme} theme`, async ({ page, api }) => {
        const account = await accountFor(role, api);
        if (account) {
          await signIn(page, account);
        }
        await useTheme(page, theme);

        for (const url of PAGES[role]) {
          await page.goto(url);
          await page.waitForLoadState('networkidle');
          await test.step(url, () => expectNoSeriousA11yViolations(page));
        }
      });
    }
  }

  test('the booking dialog has no serious issues', async ({ page, api }) => {
    await signIn(page, await api.registerClient());

    await page.goto(SEARCH);
    await page.getByRole('button', { name: 'Book' }).first().click();
    await page.getByRole('dialog').waitFor();

    await expectNoSeriousA11yViolations(page);
  });

  test('a client can search, book, and cancel with the keyboard alone', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Keyboard'), capacity: 3 });
    await signIn(page, await api.registerClient());
    const date = futureDate(95);
    await page.goto(`/?date=${date}&from=16:00&to=17:00&capacity=3`);

    // Tab to the room's Book button and press it.
    const book = page
      .locator('app-available-room-card', { has: page.getByRole('heading', { name: room.name }) })
      .getByRole('button', { name: 'Book' });
    for (let i = 0; i < 200 && !(await book.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(book).toBeFocused();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Attendees')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('heading', { name: "You're booked" })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page.goto('/bookings');
    const cancel = page.getByRole('button', { name: `Cancel booking of ${room.name}` });
    for (
      let i = 0;
      i < 100 && !(await cancel.evaluate((el) => el === document.activeElement));
      i++
    ) {
      await page.keyboard.press('Tab');
    }
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Keep it' })).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Booking cancelled')).toBeVisible();
  });
});

test.describe('small screens', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const role of Object.keys(PAGES) as TRole[]) {
    test(`${role} pages fit a 375 px screen without scrolling sideways`, async ({ page, api }) => {
      const account = await accountFor(role, api);
      if (account) {
        await signIn(page, account);
      }

      for (const url of PAGES[role]) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, url).toBeLessThanOrEqual(0);
      }
    });
  }

  test('the navigation opens as a panel', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Open menu' }).click();

    await expect(
      page.locator('#mobile-navigation').getByRole('link', { name: 'Rooms' }),
    ).toBeVisible();
  });
});

test.describe('bookings in the list', () => {
  test('are shown on a small screen too', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Small') });
    const client = await api.registerClient();
    await api.book(client, { roomId: room.id, ...slot(futureDate(96), '10:00', '11:00') });
    await page.setViewportSize({ width: 375, height: 812 });
    await signIn(page, client);

    await page.goto('/bookings');

    await expect(page.getByRole('link', { name: room.name })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
  });
});

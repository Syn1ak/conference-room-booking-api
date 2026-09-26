import { Browser, Page } from '@playwright/test';
import { TAccount, uniqueName } from './support/api';
import { expect, signIn, test } from './support/fixtures';
import { randomFutureDate, slot } from './support/slots';

/** A page in a browser context of its own, signed in as the account: another person, on another computer. */
async function personOn(browser: Browser, account: TAccount): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, account);
  return page;
}

/** Opens the booking dialog for a room from a search, and returns it. */
async function openBooking(page: Page, roomName: string, date: string, from: string, to: string) {
  await page.goto(`/?date=${date}&from=${from}&to=${to}&capacity=1`);
  await page
    .locator('app-available-room-card', { has: page.getByRole('heading', { name: roomName }) })
    .getByRole('button', { name: 'Book' })
    .click();
  const dialog = page.getByRole('dialog', { name: `Book ${roomName}` });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('concurrency and races', () => {
  test('two clients book the same room and slot at the same instant: exactly one gets it', async ({
    browser,
    api,
  }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Race') });
    const [ann, bob] = [
      await personOn(browser, await api.registerClient()),
      await personOn(browser, await api.registerClient()),
    ];
    const date = randomFutureDate();
    const annDialog = await openBooking(ann, room.name, date, '10:00', '12:00');
    const bobDialog = await openBooking(bob, room.name, date, '10:00', '12:00');

    await Promise.all([
      annDialog.getByRole('button', { name: /^Book for/ }).click(),
      bobDialog.getByRole('button', { name: /^Book for/ }).click(),
    ]);

    const outcomes = await Promise.all(
      [annDialog, bobDialog].map(async (dialog) => {
        await expect(
          dialog.getByText(/You're booked|Someone has just booked/).first(),
        ).toBeVisible();
        return (await dialog.getByRole('heading', { name: "You're booked" }).count()) === 1
          ? 'booked'
          : 'refused';
      }),
    );
    expect(outcomes.sort()).toEqual(['booked', 'refused']);

    // The loser's results refresh behind the dialog: the room is gone once it's closed.
    const loser = outcomes[0] === 'refused' ? ann : bob;
    await loser.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(loser.getByRole('heading', { name: room.name })).toHaveCount(0);
  });

  test('overlapping but different slots booked at once: one wins', async ({ browser, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Overlap') });
    const [ann, bob] = [
      await personOn(browser, await api.registerClient()),
      await personOn(browser, await api.registerClient()),
    ];
    const date = randomFutureDate();
    const annDialog = await openBooking(ann, room.name, date, '10:00', '12:00');
    const bobDialog = await openBooking(bob, room.name, date, '11:30', '13:00');

    await Promise.all([
      annDialog.getByRole('button', { name: /^Book for/ }).click(),
      bobDialog.getByRole('button', { name: /^Book for/ }).click(),
    ]);

    await expect(
      annDialog.getByText(/You're booked|Someone has just booked/).first(),
    ).toBeVisible();
    await expect(
      bobDialog.getByText(/You're booked|Someone has just booked/).first(),
    ).toBeVisible();
    const booked =
      (await annDialog.getByRole('heading', { name: "You're booked" }).count()) +
      (await bobDialog.getByRole('heading', { name: "You're booked" }).count());
    expect(booked).toBe(1);
  });

  test('a slot booked after the search was shown is refused, and the results refresh', async ({
    page,
    api,
  }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Stale') });
    await signIn(page, await api.registerClient());
    const date = randomFutureDate();
    const dialog = await openBooking(page, room.name, date, '14:00', '15:00');

    await api.book(await api.registerClient(), {
      roomId: room.id,
      ...slot(date, '14:00', '15:00'),
    });
    await dialog.getByRole('button', { name: /^Book for/ }).click();

    await expect(dialog.getByRole('alert')).toContainText('Someone has just booked this room');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: room.name })).toHaveCount(0);
  });

  test('a room deleted while its booking dialog is open is explained', async ({ page, api }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Deleted') });
    await signIn(page, await api.registerClient());
    const dialog = await openBooking(page, room.name, randomFutureDate(), '09:00', '10:00');

    await api.deleteRoom(admin, room);
    await dialog.getByRole('button', { name: /^Book for/ }).click();

    await expect(dialog.getByRole('alert')).toContainText('This room no longer exists.');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: room.name })).toHaveCount(0);
  });

  test('a service removed from the room after it was ticked is explained', async ({
    page,
    api,
  }) => {
    const admin = await api.loginAdmin();
    const service = await api.createService(admin, { standardPrice: 100 });
    const room = await api.createRoom(admin, {
      name: uniqueName('Service'),
      services: [{ serviceId: service.id }],
    });
    await signIn(page, await api.registerClient());
    const dialog = await openBooking(page, room.name, randomFutureDate(), '09:00', '10:00');
    await dialog.getByRole('checkbox', { name: new RegExp(service.name) }).check();

    await api.updateRoom(admin, room, { services: [] });
    await dialog.getByRole('button', { name: /^Book for/ }).click();

    await expect(dialog.getByRole('alert')).toContainText("The room's services have changed");
  });

  test('a price raised after the search: the confirmation shows what the server charged', async ({
    page,
    api,
  }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Price'), hourlyPrice: 1000 });
    await signIn(page, await api.registerClient());
    const dialog = await openBooking(page, room.name, randomFutureDate(), '09:00', '10:00');
    await expect(dialog.getByRole('button', { name: 'Book for 1,000.00 UAH' })).toBeVisible();

    await api.updateRoom(admin, room, { hourlyPrice: 3000 });
    await dialog.getByRole('button', { name: /^Book for/ }).click();

    await expect(dialog.getByRole('row', { name: /Total/ })).toContainText('3,000.00 UAH');
  });

  test('the same booking cancelled in two tabs: the second is told it is already cancelled', async ({
    browser,
    api,
  }) => {
    const admin = await api.loginAdmin();
    const room = await api.createRoom(admin, { name: uniqueName('Twice') });
    const client = await api.registerClient();
    await api.book(client, { roomId: room.id, ...slot(randomFutureDate(), '09:00', '10:00') });
    const context = await browser.newContext();
    const tabs = [await context.newPage(), await context.newPage()];
    for (const tab of tabs) {
      await signIn(tab, client);
      await tab.goto('/bookings');
    }

    for (const tab of tabs) {
      await tab.getByRole('button', { name: `Cancel booking of ${room.name}` }).click();
      await tab.getByRole('dialog').getByRole('button', { name: 'Cancel booking' }).click();
    }

    await expect(tabs[0].getByText('Booking cancelled')).toBeVisible();
    await expect(tabs[1].getByText('The booking is already cancelled.')).toBeVisible();
    await expect(tabs[1].getByRole('listitem').filter({ hasText: room.name })).toContainText(
      'Cancelled',
    );
  });

  test('two admins add a room with the same name at once: one gets it, the other is told', async ({
    browser,
    api,
  }) => {
    const admin = await api.loginAdmin();
    const name = uniqueName('Twin');
    const pages = [await personOn(browser, admin), await personOn(browser, admin)];
    for (const page of pages) {
      await page.goto('/admin/rooms/new');
      await page.getByLabel('Name').fill(name);
    }

    await Promise.all(pages.map((page) => page.getByRole('button', { name: 'Add room' }).click()));

    const results = await Promise.all(
      pages.map(async (page) => {
        await expect(page.getByText(/added|already exists/).first()).toBeVisible();
        return (await page.getByText('A room with this name already exists.').count()) === 1
          ? 'taken'
          : 'added';
      }),
    );
    expect(results.sort()).toEqual(['added', 'taken']);
  });

  test('a token the API rejects mid-session sends the user to sign in and back', async ({
    page,
    api,
  }) => {
    const client = await api.registerClient();
    await signIn(page, { ...client, token: 'expired-or-revoked-token' });

    await page.goto('/bookings');

    await expect(page).toHaveURL('/login?returnUrl=%2Fbookings');
    await expect(page.getByText('Your session has expired')).toBeVisible();
    await page.getByLabel('Email').fill(client.email);
    await page.getByLabel('Password', { exact: true }).fill(client.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/bookings');
    await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible();
  });

  test('when sign-in is rate-limited, the wait is shown and the button waits it out', async ({
    page,
  }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '3', 'content-type': 'application/problem+json' },
        body: JSON.stringify({ title: 'Too many requests.', status: 429 }),
      }),
    );
    await page.goto('/login');

    await page.getByLabel('Email').fill('someone@e2e.test');
    await page.getByLabel('Password', { exact: true }).fill('Whatever-1!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toContainText('Too many sign-in attempts');
    await expect(page.getByRole('button', { name: /Try again in [23] s/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled({ timeout: 5000 });
  });

  test('a network drop while booking keeps the choices, and trying again works', async ({
    page,
    api,
  }) => {
    const admin = await api.loginAdmin();
    const service = await api.createService(admin, { standardPrice: 50 });
    const room = await api.createRoom(admin, {
      name: uniqueName('Offline'),
      services: [{ serviceId: service.id }],
    });
    await signIn(page, await api.registerClient());
    const dialog = await openBooking(page, room.name, randomFutureDate(), '09:00', '10:00');
    await dialog.getByRole('checkbox', { name: new RegExp(service.name) }).check();

    await page.route('**/api/bookings', (route) => route.abort('internetdisconnected'));
    await dialog.getByRole('button', { name: /^Book for/ }).click();
    await expect(dialog.getByRole('alert')).toContainText("We couldn't reach the server.");
    await expect(dialog.getByRole('checkbox', { name: new RegExp(service.name) })).toBeChecked();

    await page.unroute('**/api/bookings');
    await dialog.getByRole('button', { name: /^Book for/ }).click();
    await expect(dialog.getByRole('heading', { name: "You're booked" })).toBeVisible();
  });
});

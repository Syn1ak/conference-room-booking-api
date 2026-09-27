import { CLIENT_PASSWORD } from '../support/api';
import { E2E_ADMIN } from '../support/e2e-environment';
import { expect, test } from '../support/fixtures';

test.describe('signing in', () => {
  test('a client signs in and lands on the room search', async ({ page, api }) => {
    const client = await api.registerClient();
    await page.goto('/login');

    await page.getByLabel('Email').fill(client.email);
    await page.getByLabel('Password', { exact: true }).fill(CLIENT_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: `Account: ${client.email}` })).toBeVisible();
  });

  test('staff sign in and land on the bookings', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill(E2E_ADMIN.email);
    await page.getByLabel('Password', { exact: true }).fill(E2E_ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/bookings');
  });

  test('a wrong password gets the same message as an unknown email', async ({ page, api }) => {
    const client = await api.registerClient();
    await page.goto('/login');

    await page.getByLabel('Email').fill(client.email);
    await page.getByLabel('Password', { exact: true }).fill('Wrong-Pass1!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Invalid email or password.');

    await page.getByLabel('Email').fill('nobody@e2e.test');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Invalid email or password.');
  });

  test('returns to the requested page', async ({ page, api }) => {
    const client = await api.registerClient();
    await page.goto('/login?returnUrl=%2Fno-access');

    await page.getByLabel('Email').fill(client.email);
    await page.getByLabel('Password', { exact: true }).fill(CLIENT_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/no-access');
  });

  test('never follows a return address to another site', async ({ page, api }) => {
    const client = await api.registerClient();
    await page.goto('/login?returnUrl=https%3A%2F%2Fevil.test%2Fsteal');

    await page.getByLabel('Email').fill(client.email);
    await page.getByLabel('Password', { exact: true }).fill(CLIENT_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/');
  });

  test('sends one request however often the button is pressed', async ({ page, api }) => {
    const client = await api.registerClient();
    let loginRequests = 0;
    await page.route('**/api/auth/login', async (route) => {
      loginRequests++;
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await page.goto('/login');

    await page.getByLabel('Email').fill(client.email);
    await page.getByLabel('Password', { exact: true }).fill(CLIENT_PASSWORD);
    const button = page.getByRole('button', { name: 'Sign in' });
    await button.click();

    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await button.click({ force: true });
    await page.getByLabel('Password', { exact: true }).press('Enter');

    await expect(page).toHaveURL('/');
    expect(loginRequests).toBe(1);
  });

  test('a signed-in user is sent away from the sign-in page', async ({ page, api }) => {
    const client = await api.registerClient();
    await page.goto('/login');
    await page.getByLabel('Email').fill(client.email);
    await page.getByLabel('Password', { exact: true }).fill(CLIENT_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/login');

    await expect(page).toHaveURL('/');
  });
});

test.describe('demo accounts', () => {
  test('a visitor signs in as the demo client in one click', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /Client/ }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Account: demo.client@e2e.test' })).toBeVisible();
  });

  test('a visitor signs in as the demo staff account and reaches the reports', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /Staff/ }).click();

    await expect(page).toHaveURL('/bookings');
    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
  });
});

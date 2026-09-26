import { randomUUID } from 'node:crypto';
import { expect, test } from '../support/fixtures';

test.describe('registering', () => {
  const newEmail = () => `new-${randomUUID()}@e2e.test`;

  test('a visitor registers and is signed in right away', async ({ page }) => {
    const email = newEmail();
    await page.goto('/register');

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Strong-Pass1!');
    await page.getByLabel('Repeat password').fill('Strong-Pass1!');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: `Account: ${email}` })).toBeVisible();
  });

  test('a taken email is shown next to the email field', async ({ page, api }) => {
    const existing = await api.registerClient();
    await page.goto('/register');

    await page.getByLabel('Email').fill(existing.email);
    await page.getByLabel('Password', { exact: true }).fill('Strong-Pass1!');
    await page.getByLabel('Repeat password').fill('Strong-Pass1!');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('An account with this email already exists.')).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  test('the policy checklist and the match check stop a bad password before it is sent', async ({
    page,
  }) => {
    let registrations = 0;
    await page.route('**/api/auth/register', (route) => {
      registrations++;
      return route.continue();
    });
    await page.goto('/register');

    await page.getByLabel('Email').fill(newEmail());
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Repeat password').fill('different');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText("The password doesn't meet all the requirements.")).toBeVisible();
    await expect(page.getByText("The passwords don't match.")).toBeVisible();
    expect(registrations).toBe(0);
  });

  test("the server's password rules are shown when the checklist is bypassed", async ({ page }) => {
    // Rewrite the password on its way out, as if the client and server rules had drifted apart.
    await page.route('**/api/auth/register', (route) =>
      route.continue({ postData: JSON.stringify({ email: 'drift@e2e.test', password: 'weak' }) }),
    );
    await page.goto('/register');

    await page.getByLabel('Email').fill(newEmail());
    await page.getByLabel('Password', { exact: true }).fill('Strong-Pass1!');
    await page.getByLabel('Repeat password').fill('Strong-Pass1!');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Passwords must be at least 8 characters.')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});

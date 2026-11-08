import { test, expect } from '@playwright/test';

const ADMIN_PATH = 'ops-7f3a9c2b4e';

test.describe('Admin Settings', () => {
  test('internal admin routes return 404 when ADMIN_PATH is set', async ({ page }) => {
    const response = await page.request.get('/auth/admin/settings');
    expect(response.status()).toBe(404);
  });

  test('settings page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto(`/${ADMIN_PATH}/settings`);

    // Should redirect to the hidden admin login path
    await expect(page).toHaveURL(`/${ADMIN_PATH}/login`);
    await expect(page.locator('h1')).toContainText('Admin Sign In');
  });

  test('login page is accessible at hidden admin path', async ({ page }) => {
    await page.goto(`/${ADMIN_PATH}/login`);
    await expect(page.locator('h1')).toContainText('Admin Sign In');
  });
});

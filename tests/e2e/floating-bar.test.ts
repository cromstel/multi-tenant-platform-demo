import { test, expect } from '@playwright/test';

const ADMIN_PATH = 'ops-7f3a9c2b4e';

test.describe('Floating Bar', () => {
  test('renders on homepage with 4 branded icons', async ({ page }) => {
    await page.goto('/');

    const bar = page.locator('aside[aria-label="Social links"]');
    await expect(bar).toBeVisible();

    await expect(bar.locator('a[aria-label="WhatsApp"]')).toBeVisible();
    await expect(bar.locator('a[aria-label="Email"]')).toBeVisible();
    await expect(bar.locator('a[aria-label="LinkedIn"]')).toBeVisible();
    await expect(bar.locator('a[aria-label="Facebook"]')).toBeVisible();
  });

  test('renders on FAQ page', async ({ page }) => {
    await page.goto('/faq');

    const bar = page.locator('aside[aria-label="Social links"]');
    await expect(bar).toBeVisible();

    await expect(bar.locator('a[aria-label="WhatsApp"]')).toBeVisible();
    await expect(bar.locator('a[aria-label="Email"]')).toBeVisible();
    await expect(bar.locator('a[aria-label="LinkedIn"]')).toBeVisible();
    await expect(bar.locator('a[aria-label="Facebook"]')).toBeVisible();
  });

  test('is hidden on auth pages', async ({ page }) => {
    await page.goto('/auth/login');

    const bar = page.locator('aside[aria-label="Social links"]');
    await expect(bar).not.toBeVisible();
  });

  test('is hidden on admin pages', async ({ page }) => {
    await page.goto(`/${ADMIN_PATH}`);

    const bar = page.locator('aside[aria-label="Social links"]');
    await expect(bar).not.toBeVisible();
  });

  test('icons have correct brand colors', async ({ page }) => {
    await page.goto('/');

    const bar = page.locator('aside[aria-label="Social links"]');
    // Email and LinkedIn should use brand ink #005cb3 (rgb(0, 92, 179))
    await expect(
      bar.locator('a[aria-label="Email"]')
    ).toHaveCSS('background-color', 'rgb(0, 92, 179)');

    await expect(
      bar.locator('a[aria-label="LinkedIn"]')
    ).toHaveCSS('background-color', 'rgb(0, 92, 179)');
  });
});

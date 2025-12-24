import { test, expect } from '@playwright/test';

// This E2E test requires a running staging deployment and test credentials.
// It will be skipped unless PLAYWRIGHT_BASE_URL and PLAYWRIGHT_TEST_USER / TEST_PASS are set.
const baseURL = process.env.PLAYWRIGHT_BASE_URL;
const testUser = process.env.PLAYWRIGHT_TEST_USER;
const testPass = process.env.PLAYWRIGHT_TEST_PASS;

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  if (!baseURL || !testUser || !testPass) test.skip();
  await page.goto(`${baseURL}/login`);
});

test('Doctor can update appointment notes via UI', async ({ page }) => {
  // Login
  await page.fill('input[name="email"]', testUser);
  await page.fill('input[name="password"]', testPass);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  // Navigate to appointments
  await page.goto(`${baseURL}/dashboard/appointments`);

  // Open first appointment (assumes at least one exists)
  const firstRow = page.locator('table tr').nth(1);
  await expect(firstRow).toBeVisible();

  await firstRow.click();
  await page.fill('textarea[name="notes"]', 'E2E test note');
  await page.click('button:has-text("Save")');

  // Assert success toast or updated notes visible
  await expect(page.locator('text=Appointment updated')).toBeVisible({ timeout: 5000 });
});

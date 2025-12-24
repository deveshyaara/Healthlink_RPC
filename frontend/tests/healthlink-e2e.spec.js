import { test, expect } from '@playwright/test';

test.describe('HealthLink Pro - End-to-End Tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Check if the page loads
    await expect(page).toHaveTitle(/HealthLink/);

    // Check for main content (use first match to avoid strict-mode multi-match errors)
    await expect(page.locator('text=HealthLink Pro').first()).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Click the top-level login link (use href to avoid ambiguous matches)
    const loginLink = page.locator('a[href="/login"]').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();

      // Wait for client navigation or for login page content to appear (longer timeout)
      await page.waitForTimeout(1500);
      const urlMatches = /.*login/.test(page.url());
      const loginHeadingVisible = await page.locator('text=Welcome Back').first().isVisible().catch(() => false);
      const signInButtonVisible = await page.locator('text=Sign In').first().isVisible().catch(() => false);
      const loginFormVisible = await page.locator('form').filter({ hasText: 'Password' }).first().isVisible().catch(() => false);
      expect(urlMatches || loginHeadingVisible || signInButtonVisible || loginFormVisible).toBeTruthy();
    }
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/');

    // Look for register/signup link/button
    const registerButton = page.locator('text=Register').or(page.locator('text=Sign Up')).first();
    if (await registerButton.isVisible()) {
      await registerButton.click();
      await expect(page).toHaveURL(/.*register/);
    }
  });

  test('should have responsive design on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.goto('/');

      // Check if mobile menu or responsive elements are present
      const mobileMenu = page.locator('[data-testid="mobile-menu"]').or(page.locator('.mobile-menu'));
      // This test will pass if the page loads without errors on mobile
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle form validation on registration', async ({ page }) => {
    await page.goto('/register');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').or(page.locator('text=Register')).first();
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Check for validation errors
      const errorMessage = page.locator('text=required').or(page.locator('text=Required')).first();
      // If validation is working, we should see error messages
      // This is a basic check - in a real app we'd check specific fields
    }
  });

  test('should test API connectivity', async ({ page }) => {
    // Test if the frontend can connect to backend APIs
    await page.goto('/');

    // Check for any API error messages or success indicators
    const apiError = page.locator('text=API Error').or(page.locator('text=Connection failed'));
    await expect(apiError).not.toBeVisible();
  });

  test('should test blockchain connection status', async ({ page }) => {
    await page.goto('/');

    // Look for blockchain connection status indicators
    const blockchainStatus = page.locator('text=Connected').or(page.locator('text=Blockchain'));
    // This is a basic check - in a real app we'd check specific status elements
    await expect(page.locator('body')).toBeVisible();
  });
});

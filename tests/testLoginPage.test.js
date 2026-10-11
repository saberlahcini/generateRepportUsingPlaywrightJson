import { test, expect } from '@playwright/test';



test.describe('Login Page Tests', () => {

  test('should display the login page', async ({ page }) => {
    await page.goto('https://app.simplelogin.io/auth/login');
    await expect(page).toHaveTitle(/Login/);
  })

});
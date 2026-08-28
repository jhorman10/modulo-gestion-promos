import { test, expect } from '@playwright/test';

/**
 * 5.6 RED: Percentage boundary values E2E test
 * 0.01 and 1.00 accepted, 0.005 rejected
 */
test.describe('Percentage Boundary Values', () => {
  const fillForm = async (page: import('@playwright/test').Page, name: string, value: string) => {
    await page.goto('/promotions/new');
    await page.waitForURL('/promotions/new');

    await page.fill('#name', name);
    await page.selectOption('#discount_type', 'percentage');
    await page.fill('#discount_value', value);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(9, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);
    endDate.setHours(18, 0, 0, 0);

    const formatDate = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    await page.fill('#start_date', formatDate(startDate));
    await page.fill('#end_date', formatDate(endDate));

    // Select products and categories
    const productSelect = page.locator('select').nth(0);
    const firstProductOption = productSelect.locator('option').first();
    await firstProductOption.click();

    const categorySelect = page.locator('select').nth(1);
    const firstCategoryOption = categorySelect.locator('option').first();
    await firstCategoryOption.click();
  };

  test('5.6a accepts minimum percentage (0.01)', async ({ page }) => {
    await fillForm(page, 'Min Percentage Test', '0.01');

    // Submit should succeed
    await page.click('button[type="submit"]');

    // Should redirect to promotions list
    await page.waitForURL('/promotions');

    // Verify the promotion appears
    await expect(page.locator('text=Min Percentage Test')).toBeVisible();
  });

  test('5.6b accepts maximum percentage (1.00)', async ({ page }) => {
    await fillForm(page, 'Max Percentage Test', '1.00');

    // Submit should succeed
    await page.click('button[type="submit"]');

    // Should redirect to promotions list
    await page.waitForURL('/promotions');

    // Verify the promotion appears
    await expect(page.locator('text=Max Percentage Test')).toBeVisible();
  });

  test('5.6c rejects below minimum percentage (0.005)', async ({ page }) => {
    await fillForm(page, 'Below Min Test', '0.005');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    const error = page.locator('[role="alert"]').filter({ text: /Porcentaje debe estar entre/ });
    await expect(error).toBeVisible();

    // Should NOT redirect (still on form)
    await expect(page).toHaveURL(/\/promotions\/new/);
  });

  test('5.6d rejects above maximum percentage (1.01)', async ({ page }) => {
    await fillForm(page, 'Above Max Test', '1.01');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    const error = page.locator('[role="alert"]').filter({ text: /Porcentaje debe estar entre/ });
    await expect(error).toBeVisible();

    // Should NOT redirect (still on form)
    await expect(page).toHaveURL(/\/promotions\/new/);
  });
});

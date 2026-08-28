import { test, expect } from '@playwright/test';

/**
 * 5.3 RED: Soft delete exclusion E2E test
 * Delete Programada → verify removed from list and summary
 */
test.describe('Soft Delete Exclusion', () => {
  test('5.3 delete Programada promotion removes from list and summary', async ({ page }) => {
    // First, get current summary count
    await page.goto('/summary');
    await page.waitForURL('/summary');

    const programadaBefore = await page.locator('[data-testid="count-programada"]').textContent();

    // Navigate to new promotion form
    await page.goto('/promotions/new');
    await page.waitForURL('/promotions/new');

    // Fill in the promotion form
    const uniqueName = `Delete Test ${Date.now()}`;
    await page.fill('#name', uniqueName);
    await page.selectOption('#discount_type', 'fixed');
    await page.fill('#discount_value', '100');

    // Set dates: start today, end in 15 days
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(9, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 15);
    endDate.setHours(18, 0, 0, 0);

    const formatDate = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    await page.fill('#start_date', formatDate(startDate));
    await page.fill('#end_date', formatDate(endDate));

    // Select first product and category
    const productSelect = page.locator('select').nth(0);
    const firstProductOption = productSelect.locator('option').first();
    await firstProductOption.click();

    const categorySelect = page.locator('select').nth(1);
    const firstCategoryOption = categorySelect.locator('option').first();
    await firstCategoryOption.click();

    // Submit the form
    await page.click('button[type="submit"]');

    // Should redirect to promotions list
    await page.waitForURL('/promotions');

    // Verify the new promotion appears
    const row = page.locator('tr').filter({ hasText: uniqueName });
    await expect(row).toBeVisible();

    // Click delete button
    const deleteBtn = row.getByRole('button', { name: /Eliminar/i });
    await deleteBtn.click();

    // Wait for list to refresh
    await page.waitForTimeout(1000);

    // Verify the promotion is no longer in the list
    await expect(row).not.toBeVisible();

    // Navigate to summary and verify count hasn't increased
    await page.click('a[href="/summary"]');
    await page.waitForURL('/summary');

    const programadaAfter = await page.locator('[data-testid="count-programada"]').textContent();

    // The count should be the same or less (not increased)
    if (programadaBefore !== null && programadaAfter !== null) {
      expect(parseInt(programadaAfter)).toBeLessThanOrEqual(parseInt(programadaBefore));
    }
  });
});

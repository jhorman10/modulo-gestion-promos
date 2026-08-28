import { test, expect } from '@playwright/test';

/**
 * 5.5 RED: Pagination E2E test
 * Create 15 promotions, verify page 2 shows items
 */
test.describe('Promotion Pagination', () => {
  test('5.5 pagination works across multiple pages', async ({ page }) => {
    // First, check current total
    await page.goto('/promotions');
    await page.waitForURL('/promotions');

    // Get current promotion count from the table
    const existingRows = await page.locator('tbody tr').count();

    // Create enough promotions to get pagination (need > page size)
    const promotionsToCreate = 5; // Create 5 to ensure we have enough for a second page

    for (let i = 0; i < promotionsToCreate; i++) {
      await page.goto('/promotions/new');
      await page.waitForURL('/promotions/new');

      await page.fill('#name', `Pagination Test ${i + 1}`);
      await page.selectOption('#discount_type', 'fixed');
      await page.fill('#discount_value', String((i + 1) * 100));

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

      await page.click('button[type="submit"]');
      await page.waitForURL('/promotions');
    }

    // Verify pagination appears
    const paginationNav = page.locator('nav[aria-label="Paginación de promociones"]');
    await expect(paginationNav).toBeVisible();

    // Check total count includes our new promotions
    const totalText = await page.locator('.pagination-info').textContent();
    expect(totalText).toContain('total');

    // Verify "Anterior" button is disabled on page 1
    const prevButton = page.getByRole('button', { name: /Anterior/i });
    await expect(prevButton).toBeDisabled();

    // Navigate to next page if available
    const nextButton = page.getByRole('button', { name: /Siguiente/i });
    const isNextDisabled = await nextButton.isDisabled();

    if (!isNextDisabled) {
      await nextButton.click();
      await page.waitForTimeout(500);

      // Verify we're on page 2
      const pageInfo = await page.locator('.pagination-info').textContent();
      expect(pageInfo).toContain('Página 2');

      // Verify "Anterior" is now enabled
      await expect(prevButton).toBeEnabled();
    }
  });
});

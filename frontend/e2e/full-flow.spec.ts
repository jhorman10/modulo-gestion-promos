import { test, expect } from '@playwright/test';

/**
 * 5.1 RED: Full flow E2E test
 * Create → Activate → Summary shows active → Finalize → Summary shows finalized
 */
test.describe('Full Promotion Lifecycle', () => {
  test('5.1 create → activate → summary → finalize → summary', async ({ page }) => {
    // Navigate to new promotion form
    await page.goto('/promotions/new');

    // Fill in the promotion form
    await page.fill('#name', 'E2E Lifecycle Promo');
    await page.selectOption('#discount_type', 'percentage');
    await page.fill('#discount_value', '0.15');

    // Set dates: start today, end in 30 days
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

    // Select first product (Ctrl+click for multi-select)
    const productSelect = page.locator('select').nth(0);
    const firstProductOption = productSelect.locator('option').first();
    await firstProductOption.click();

    // Select first category
    const categorySelect = page.locator('select').nth(1);
    const firstCategoryOption = categorySelect.locator('option').first();
    await firstCategoryOption.click();

    // Submit the form
    await page.click('button[type="submit"]');

    // Should redirect to promotions list
    await page.waitForURL('/promotions');

    // Verify the new promotion appears in the list
    await expect(page.locator('text=E2E Lifecycle Promo')).toBeVisible();

    // Verify status is Programada
    const row = page.locator('tr').filter({ hasText: 'E2E Lifecycle Promo' });
    await expect(row.locator('.badge')).toContainText('Programada');

    // Navigate to summary to verify counts
    await page.click('a[href="/summary"]');
    await page.waitForURL('/summary');

    // Summary should show the promotion
    const programadaCount = page.locator('[data-testid="count-programada"]');
    await expect(programadaCount).not.toHaveText('0');

    // Go back to list and activate
    await page.click('a[href="/promotions"]');
    await page.waitForURL('/promotions');

    // Click activate button on our promotion
    const activateBtn = row.getByRole('button', { name: /Activar/i });
    await activateBtn.click();

    // Wait for list to refresh
    await page.waitForTimeout(1000);

    // Verify status changed to Activa
    await expect(row.locator('.badge')).toContainText('Activa');

    // Navigate to summary to verify active count
    await page.click('a[href="/summary"]');
    await page.waitForURL('/summary');

    const activaCount = page.locator('[data-testid="count-activa"]');
    await expect(activaCount).not.toHaveText('0');

    // Go back to list and finalize
    await page.click('a[href="/promotions"]');
    await page.waitForURL('/promotions');

    // Click finalize button
    const finalizeBtn = row.getByRole('button', { name: /Finalizar/i });
    await finalizeBtn.click();

    // Wait for list to refresh
    await page.waitForTimeout(1000);

    // Verify status changed to Finalizada
    await expect(row.locator('.badge')).toContainText('Finalizada');

    // Navigate to summary to verify finalized count
    await page.click('a[href="/summary"]');
    await page.waitForURL('/summary');

    const finalizadaCount = page.locator('[data-testid="count-finalizada"]');
    await expect(finalizadaCount).not.toHaveText('0');
  });
});

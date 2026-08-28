import { test, expect } from '@playwright/test';

/**
 * 5.4 RED: Invalid transitions blocked in UI
 * Activate Finalizada, finalize Programada, delete Activa — all should fail
 */
test.describe('Invalid State Transitions', () => {
  test('5.4a cannot activate a Finalizada promotion', async ({ page }) => {
    // Navigate to list and find a Finalizada promotion (or create one)
    await page.goto('/promotions');
    await page.waitForURL('/promotions');

    // Look for any Finalizada promotion
    const finalizadaRow = page.locator('tr').filter({ hasText: 'Finalizada' }).first();

    // If there's a Finalizada promotion, verify activate button is not present
    const count = await finalizadaRow.count();
    if (count > 0) {
      const activateBtn = finalizadaRow.getByRole('button', { name: /Activar/i });
      await expect(activateBtn).not.toBeVisible();
    }
  });

  test('5.4b cannot finalize a Programada promotion', async ({ page }) => {
    await page.goto('/promotions');
    await page.waitForURL('/promotions');

    // Look for any Programada promotion
    const programadaRow = page.locator('tr').filter({ hasText: 'Programada' }).first();

    const count = await programadaRow.count();
    if (count > 0) {
      const finalizeBtn = programadaRow.getByRole('button', { name: /Finalizar/i });
      await expect(finalizeBtn).not.toBeVisible();
    }
  });

  test('5.4c cannot delete an Activa promotion', async ({ page }) => {
    await page.goto('/promotions');
    await page.waitForURL('/promotions');

    // Look for any Activa promotion
    const activaRow = page.locator('tr').filter({ hasText: 'Activa' }).first();

    const count = await activaRow.count();
    if (count > 0) {
      const deleteBtn = activaRow.getByRole('button', { name: /Eliminar/i });
      await expect(deleteBtn).not.toBeVisible();
    }
  });

  test('5.4d Finalizada promotion has no action buttons', async ({ page }) => {
    await page.goto('/promotions');
    await page.waitForURL('/promotions');

    const finalizadaRow = page.locator('tr').filter({ hasText: 'Finalizada' }).first();
    const count = await finalizadaRow.count();

    if (count > 0) {
      const actionsGroup = finalizadaRow.locator('[role="group"]');
      const buttons = actionsGroup.getByRole('button');
      await expect(buttons).toHaveCount(0);
    }
  });
});

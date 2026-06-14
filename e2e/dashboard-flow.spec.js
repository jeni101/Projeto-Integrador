import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E — fluxo crítico A1.8', () => {
  test('Principal → vê alerta → navega para Alertas → Histórico', async ({ page }) => {
    await page.goto('/#/principal');

    await expect(page.locator('#nav-container nav')).toContainText('Principal', { timeout: 15000 });
    await expect(page.locator('#app-container')).toContainText('Centro Analítico', { timeout: 30000 });

    const alertasLink = page.locator('a[href="#/alertas"]').first();
    await expect(alertasLink).toBeVisible();

    await alertasLink.click();
    await expect(page.locator('#app-container')).toContainText('Alertas', { timeout: 10000 });
    await expect(page.locator('#app-container')).toContainText('Umidade', { timeout: 10000 });

    await page.locator('a[href="#/historico"]').click();
    await expect(page.locator('#app-container')).toContainText('Histórico', { timeout: 10000 });
    await expect(page.locator('table')).toBeVisible();
  });

  test('Cadastro de canteiros — listagem e formulário', async ({ page }) => {
    await page.goto('/#/canteiros');
    await expect(page.locator('#app-container')).toContainText('Cadastro de Canteiros');
    await expect(page.locator('#app-container')).toContainText('Canteiro Alface');
    await page.locator('#btn-novo-canteiro').click();
    await expect(page.locator('#form-canteiro-nome')).toBeVisible();
  });
});

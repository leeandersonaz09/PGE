import { test, expect } from '@playwright/test';

test.describe('Fluxo Inicial', () => {
  test('A página raiz (Login/SSO) deve montar sem crachar', async ({ page }) => {
    // Acessa a rota raiz definida no baseURL do playwright.config.ts
    await page.goto('/');

    // Verifica se o body renderizou
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Como o PGE usa Google SSO, o login de teste no futuro mockará o Contexto de Auth
  });
});

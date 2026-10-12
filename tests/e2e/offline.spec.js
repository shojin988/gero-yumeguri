import { test, expect } from '@playwright/test';
import { FACILITIES, openApp } from './helpers.js';

test.use({ serviceWorkers: 'allow' });

test('keeps working offline after the first visit', async ({ page, context }) => {
  await openApp(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.locator('.pin')).toHaveCount(FACILITIES.length);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('tab', { name: '一覧' }).click();
  await expect(page.locator('#facility-list .facility-card')).toHaveCount(FACILITIES.length);
  await expect(page.locator('#offline-badge')).toBeVisible();
});

test('links the web app manifest', async ({ page }) => {
  await openApp(page);
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const response = await page.request.get(href);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
});

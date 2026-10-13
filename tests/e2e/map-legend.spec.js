import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

test('explains the pin colours in a legend', async ({ page }) => {
  await openApp(page);
  const legend = page.locator('.map-legend');
  await expect(legend.locator('.legend-title')).toHaveText('凡例');
  await expect(legend.locator('li')).toHaveText(['今から入れる', '今日このあと入れる', '今日は入れない', '今は入れない']);
  await expect(legend.locator('li .legend-dot.status-open')).toHaveCount(1);
});

test('shows the legend in the chosen language', async ({ page }) => {
  await openApp(page, { path: '/?lang=en' });
  await expect(page.locator('.map-legend .legend-title')).toHaveText('Legend');
  await expect(page.locator('.map-legend li').first()).toHaveText('Open now');
});

test('shows facility names only when zoomed in', async ({ page }) => {
  await openApp(page);
  const map = page.locator('#map');
  await expect(map).not.toHaveClass(/show-labels/);
  // 拡大のアニメーション中に押すと無視されるので、1段ずつ拡大が終わるのを待つ
  for (let step = 0; step < 4; step += 1) {
    const scale = await page.locator('.leaflet-proxy').getAttribute('style');
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect(page.locator('.leaflet-proxy')).not.toHaveAttribute('style', scale);
    await page.waitForTimeout(300);
  }
  await expect(map).toHaveClass(/show-labels/);
  await expect(page.locator('.pin-label').filter({ hasText: '水明館' })).toBeVisible();
});

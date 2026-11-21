import { test, expect } from '@playwright/test';
import { FACILITIES, SHOPS, openApp } from './helpers.js';

const foodButton = (page) => page.locator('#category-bar').getByRole('button', { name: '飲食店' });
const chip = (page, name) => page.locator('#shop-filter').getByRole('button', { name, exact: true });

async function openList(page, options) {
  await openApp(page, options);
  await page.getByRole('tab', { name: '一覧' }).click();
}

test('shows the cuisine row only while restaurants are on', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#shop-filter')).toBeHidden();
  await foodButton(page).click();
  await expect(page.locator('#shop-filter')).toBeVisible();
  await expect(page.locator('#shop-filter .cuisine-chip')).toHaveText(['すべて', '和食・定食', 'そば・麺', '寿司', '焼肉・飛騨牛', '居酒屋', '洋食', '中華', 'カレー']);
  await expect(chip(page, 'すべて')).toHaveAttribute('aria-pressed', 'true');
  await foodButton(page).click();
  await expect(page.locator('#shop-filter')).toBeHidden();
});

test('narrows map pins to the chosen cuisine', async ({ page }) => {
  await openApp(page);
  await foodButton(page).click();
  await chip(page, '居酒屋').click();
  await expect(chip(page, '居酒屋')).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(page, 'すべて')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.shop-pin')).toHaveCount(1);
  await expect(page.locator('.shop-pin.shop-id-osm-node-4')).toHaveCount(1);
  await expect(page.locator('.pin')).toHaveCount(FACILITIES.length);
  await chip(page, 'すべて').click();
  await expect(page.locator('.shop-pin')).toHaveCount(SHOPS.length);
});

test('narrows the list to the chosen cuisine', async ({ page }) => {
  await openList(page);
  await foodButton(page).click();
  await chip(page, 'そば・麺').click();
  await expect(page.locator('#facility-list .shop-card h3')).toHaveText(['テストそば']);
  await expect(page.locator('#facility-list .facility-card:not(.shop-card)')).toHaveCount(FACILITIES.length);
});

test('shows the empty message when no restaurant matches', async ({ page }) => {
  await openList(page, { savedCategories: ['food'] });
  await chip(page, 'カレー').click();
  await expect(page.locator('#facility-list')).toContainText('条件に合う施設はありません');
});

test('keeps the chosen cuisine while restaurants are switched off and on', async ({ page }) => {
  await openApp(page);
  await foodButton(page).click();
  await chip(page, '居酒屋').click();
  await foodButton(page).click();
  await foodButton(page).click();
  await expect(chip(page, '居酒屋')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.shop-pin')).toHaveCount(1);
});

test('starts from all again after reopening', async ({ page }) => {
  await openApp(page);
  await foodButton(page).click();
  await chip(page, '居酒屋').click();
  await page.reload();
  await expect(chip(page, 'すべて')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.shop-pin')).toHaveCount(SHOPS.length);
});

test('hides the cuisine row on the plan tab', async ({ page }) => {
  await openApp(page);
  await foodButton(page).click();
  await page.getByRole('tab', { name: 'プラン' }).click();
  await expect(page.locator('#shop-filter')).toBeHidden();
  await page.getByRole('tab', { name: '地図' }).click();
  await expect(page.locator('#shop-filter')).toBeVisible();
});

test('hides the cuisine row when shops fail to load', async ({ page }) => {
  await openApp(page, { shops: 'fail' });
  await foodButton(page).click();
  await expect(page.locator('#notices')).toContainText('飲食店の情報を読み込めませんでした。');
  await expect(page.locator('#shop-filter')).toBeAttached();
  await expect(page.locator('#shop-filter')).toBeHidden();
});

test('does not scroll the page sideways', async ({ page }) => {
  await openApp(page);
  await foodButton(page).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('shows English cuisine groups', async ({ page }) => {
  await openApp(page, { path: '/?lang=en' });
  await page.locator('#category-bar').getByRole('button', { name: 'Restaurants' }).click();
  await expect(chip(page, 'Yakiniku & Hida beef')).toBeVisible();
  await chip(page, 'Izakaya').click();
  await expect(page.locator('.shop-pin')).toHaveCount(1);
});

const evening = (page) => page.getByLabel('夜（19時以降）も開いている店だけ');

test('evening filter keeps restaurants open after 7 pm', async ({ page }) => {
  await openApp(page);
  await foodButton(page).click();
  await evening(page).check();
  await expect(page.locator('.shop-pin')).toHaveCount(1);
  await expect(page.locator('.shop-pin.shop-id-osm-node-4')).toHaveCount(1);
  await page.getByRole('tab', { name: '一覧' }).click();
  await expect(page.locator('#facility-list .shop-card h3')).toHaveText(['テスト酒場']);
});

test('evening filter combines with the cuisine', async ({ page }) => {
  await openApp(page);
  await foodButton(page).click();
  await chip(page, 'そば・麺').click();
  await evening(page).check();
  await expect(page.locator('.shop-pin')).toHaveCount(0);
  await chip(page, '居酒屋').click();
  await expect(page.locator('.shop-pin')).toHaveCount(1);
});

test('open-only and evening filter combine in the list', async ({ page }) => {
  await openList(page);
  await foodButton(page).click();
  await evening(page).check();
  await page.getByLabel('今から行けるところだけ').check();
  // テスト酒場は 10:00 にはまだ開いていない（later）
  await expect(page.locator('#facility-list .shop-card')).toHaveCount(0);
  await expect(page.locator('#facility-list .facility-card:not(.shop-card)').first()).toBeVisible();
});

test('evening filter is off again after reopening', async ({ page }) => {
  await openApp(page);
  await foodButton(page).click();
  await evening(page).check();
  await page.reload();
  await expect(evening(page)).not.toBeChecked();
  await expect(page.locator('.shop-pin')).toHaveCount(SHOPS.length);
});

test('shows the English evening filter', async ({ page }) => {
  await openApp(page, { path: '/?lang=en' });
  await page.locator('#category-bar').getByRole('button', { name: 'Restaurants' }).click();
  await expect(page.getByLabel('Only restaurants open after 7 pm')).toBeVisible();
});

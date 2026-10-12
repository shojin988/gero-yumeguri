import { test, expect } from '@playwright/test';
import { FACILITIES, MONDAY_10AM, openApp } from './helpers.js';

test('shows every facility and the current location on the map', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('.me')).toHaveCount(1);
  await expect(page.locator('#notices')).not.toContainText('下呂駅を基準');
});

test('opens a facility card when a pin is tapped', async ({ page }) => {
  await openApp(page);
  await page.locator('.pin').first().click();
  const card = page.locator('#map-card');
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: '公式サイト' })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Googleマップで開く' })).toBeVisible();
  await expect(card).toContainText('手形の時間');
});

test('switches between the three tabs', async ({ page }) => {
  await openApp(page);
  await page.getByRole('tab', { name: '一覧' }).click();
  await expect(page.locator('#tab-list')).toBeVisible();
  await expect(page.locator('#tab-map')).toBeHidden();
  await page.getByRole('tab', { name: 'プラン' }).click();
  await expect(page.locator('#tab-plan')).toBeVisible();
  await page.getByRole('tab', { name: '地図' }).click();
  await expect(page.locator('#tab-map')).toBeVisible();
});

test('shows the offline badge when the network drops', async ({ page, context }) => {
  await openApp(page);
  await context.setOffline(true);
  await expect(page.locator('#offline-badge')).toBeVisible();
});

test('warns when the data is older than 180 days', async ({ page }) => {
  await openApp(page, { now: new Date('2027-09-01T10:00:00+09:00') });
  await expect(page.locator('#notices')).toContainText('データが古い可能性があります');
});

test('opens the info dialog', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: '情報' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('データ確認日');
  await expect(dialog.getByRole('link', { name: '公式の湯めぐり手形ページ' })).toBeVisible();
});

test('explains when the data cannot be loaded', async ({ page }) => {
  await page.route('**/data/facilities.json', (route) => route.fulfill({ status: 500, body: 'error' }));
  await page.goto('/');
  await expect(page.locator('#notices')).toContainText('データを読み込めませんでした');
  await expect(page.locator('#notices').getByRole('link', { name: '公式の湯めぐり手形ページ' })).toBeVisible();
});

test('runs without holiday data when holidays.json fails to load', async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.route('**/data/holidays.json', (route) => route.fulfill({ status: 500, body: 'error' }));
  await page.clock.setFixedTime(MONDAY_10AM);
  await page.goto('/');
  await expect(page.locator('.pin')).toHaveCount(FACILITIES.length);
  await expect(page.locator('#notices')).toContainText('祝日データがありません');
});

test.describe('without location permission', () => {
  test.use({ permissions: [] });

  test('falls back to Gero station', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#notices')).toContainText('現在地が取れないため', { timeout: 15_000 });
    await expect(page.locator('.me')).toHaveCount(0);
  });
});

test.describe('far from Gero', () => {
  test.use({ geolocation: { latitude: 35.681, longitude: 139.767 } });

  test('uses Gero station as the origin', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#notices')).toContainText('下呂から離れているため');
  });
});

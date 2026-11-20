import { test, expect } from '@playwright/test';
import { FACILITIES, openApp } from './helpers.js';

const foodButton = (page) => page.locator('#category-bar').getByRole('button', { name: '飲食店' });
const onsenButton = (page) => page.locator('#category-bar').getByRole('button', { name: '温泉' });
const shopCard = (page, name) => page.locator('#facility-list .shop-card').filter({ has: page.getByRole('heading', { name }) });

async function openList(page, options) {
  await openApp(page, options);
  await page.getByRole('tab', { name: '一覧' }).click();
}

test('starts with onsen only', async ({ page }) => {
  await openList(page);
  await expect(onsenButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(foodButton(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#facility-list .shop-card')).toHaveCount(0);
});

test('shows restaurants in the list when toggled', async ({ page }) => {
  await openList(page);
  await foodButton(page).click();
  await expect(foodButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#facility-list .shop-card')).toHaveCount(3);
  await expect(page.locator('#facility-list .facility-card:not(.shop-card)')).toHaveCount(FACILITIES.length);

  const soba = shopCard(page, 'テストそば');
  await expect(soba.locator('.card-cuisine')).toHaveText('そば');
  await expect(soba.locator('.card-hours')).toHaveText('営業時間：09:30〜15:00（ラストオーダー14:30）');
  await expect(soba.getByRole('link', { name: '公式サイト' })).toHaveAttribute('href', 'https://example.com/soba');
  await expect(soba.getByRole('link', { name: 'Googleマップで開く' })).toBeVisible();

  const tei = shopCard(page, 'テスト亭');
  await expect(tei.locator('.card-hours')).toHaveText('営業時間は店にご確認ください');
  await expect(tei.getByRole('link', { name: '公式サイト' })).toHaveCount(0);

  await expect(shopCard(page, 'テスト食堂').locator('.card-irregular')).toHaveText('不定休あり・店にご確認ください');
  await expect(page.locator('#facility-list .shop-card .exterior-button')).toHaveCount(0);
});

test('open-only hides closed and unconfirmed restaurants', async ({ page }) => {
  await openList(page);
  await foodButton(page).click();
  await page.getByLabel('今から行けるところだけ').check();
  await expect(page.locator('#facility-list .shop-card h3')).toHaveText(['テストそば']);
});

test('remembers the chosen categories', async ({ page }) => {
  await openList(page);
  await foodButton(page).click();
  await page.reload();
  await expect(foodButton(page)).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('tab', { name: '一覧' }).click();
  await expect(page.locator('#facility-list .shop-card')).toHaveCount(3);
});

test('asks to choose when everything is off', async ({ page }) => {
  await openList(page);
  await onsenButton(page).click();
  await expect(page.locator('#facility-list')).toContainText('表示する種類を選んでください');
});

test('hides the toggle on the plan tab', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#category-bar')).toBeVisible();
  await page.getByRole('tab', { name: 'プラン' }).click();
  await expect(page.locator('#category-bar')).toBeHidden();
  await page.getByRole('tab', { name: '地図' }).click();
  await expect(page.locator('#category-bar')).toBeVisible();
});

test('keeps onsen working when shops fail to load', async ({ page }) => {
  await openApp(page, { shops: 'fail' });
  await expect(page.locator('.pin')).toHaveCount(FACILITIES.length);
  await expect(page.locator('#notices')).not.toContainText('飲食店の情報を読み込めませんでした。');
  await foodButton(page).click();
  await expect(page.locator('#notices')).toContainText('飲食店の情報を読み込めませんでした。');
});

test('shows English cuisine and translated shop name', async ({ page }) => {
  await openApp(page, { path: '/?lang=en' });
  await page.getByRole('tab', { name: 'List' }).click();
  await page.locator('#category-bar').getByRole('button', { name: 'Restaurants' }).click();
  const card = page.locator('#facility-list .shop-card').filter({ has: page.getByRole('heading', { name: 'Test Soba' }) });
  await expect(card.locator('.card-cuisine')).toHaveText('Soba');
});

import { test, expect } from '@playwright/test';
import { FACILITIES, openApp } from './helpers.js';

const WITH_VIEW = FACILITIES.find((facility) => facility.streetViewUrl);
const WITHOUT_VIEW = FACILITIES.find((facility) => facility.streetViewUrl === null);

test('shows the street view in the map card when a pin is tapped', async ({ page }) => {
  await openApp(page);
  await page.locator(`.pin-id-${WITH_VIEW.id}`).click();
  const frame = page.locator('#map-card iframe.exterior-frame');
  await expect(frame).toHaveAttribute('src', WITH_VIEW.streetViewUrl);
  await expect(frame).toHaveAttribute('title', `${WITH_VIEW.name}の外観（Googleストリートビュー）`);
});

test('explains when a facility has no street view', async ({ page }) => {
  await openApp(page);
  await page.locator(`.pin-id-${WITHOUT_VIEW.id}`).click();
  await expect(page.locator('#map-card')).toContainText('外観の写真はありません');
  await expect(page.locator('#map-card iframe')).toHaveCount(0);
});

test('opens the street view from the list in a dialog', async ({ page }) => {
  await openApp(page);
  await page.getByRole('tab', { name: '一覧' }).click();
  await page.locator(`#facility-list [data-facility-id="${WITH_VIEW.id}"]`).getByRole('button', { name: '外観を見る' }).click();
  const dialog = page.locator('#exterior-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('iframe.exterior-frame')).toHaveAttribute('src', WITH_VIEW.streetViewUrl);
  await dialog.getByRole('button', { name: '閉じる' }).click();
  await expect(dialog).toBeHidden();
  await expect(dialog.locator('iframe')).toHaveCount(0);
});

test('does not load the street view while offline', async ({ page, context }) => {
  await openApp(page);
  await context.setOffline(true);
  await page.locator(`.pin-id-${WITH_VIEW.id}`).click();
  await expect(page.locator('#map-card')).toContainText('オフラインのため外観は表示できません');
  await expect(page.locator('#map-card iframe')).toHaveCount(0);
});

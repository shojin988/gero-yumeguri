import { test, expect } from '@playwright/test';
import { FACILITIES, openApp } from './helpers.js';

async function openList(page) {
  await openApp(page);
  await page.getByRole('tab', { name: '一覧' }).click();
  return page.locator('#facility-list .facility-card');
}

test('lists every facility nearest first by default, without any price', async ({ page }) => {
  const cards = await openList(page);
  await expect(cards).toHaveCount(FACILITIES.length);
  await expect(page.getByLabel('並び順')).toHaveValue('distance');
  await expect(page.locator('#list-sort option[value="savings"]')).toHaveCount(0);
  await expect(page.locator('#facility-list')).not.toContainText('お得');
  await expect(page.locator('#facility-list')).not.toContainText('円');
  const walks = await cards.evaluateAll((nodes) => nodes.map((node) => node.dataset.walk));
  const numeric = walks.filter((walk) => walk !== '').map(Number);
  expect(numeric).toEqual([...numeric].sort((a, b) => a - b));
  expect(walks.slice(numeric.length).every((walk) => walk === '')).toBe(true);
});

test('filters to facilities that are open right now', async ({ page }) => {
  const cards = await openList(page);
  await page.getByLabel('今から入れる施設だけ').check();
  const classes = await cards.evaluateAll((nodes) => nodes.map((node) => node.className));
  expect(classes.length).toBeGreaterThan(0);
  expect(classes.every((name) => name.includes('status-open'))).toBe(true);
});

test('shows a message when nothing matches the filter', async ({ page }) => {
  await openApp(page, { now: new Date('2026-10-05T23:30:00+09:00') });
  await page.getByRole('tab', { name: '一覧' }).click();
  await page.getByLabel('今から入れる施設だけ').check();
  await expect(page.locator('#facility-list')).toContainText('条件に合う施設はありません');
});

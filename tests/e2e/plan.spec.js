import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

const AFTERNOON_ON_SAME_DAY = new Date('2026-10-05T13:00:00+09:00');

async function fireVisibilityChange(page) {
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
}

async function openPlan(page) {
  await openApp(page);
  await page.getByRole('tab', { name: 'プラン' }).click();
}

async function submit(page) {
  await page.getByRole('button', { name: 'プランを作る' }).click();
}

test('fills defaults from the clock and saved inputs', async ({ page }) => {
  await openPlan(page);
  await expect(page.locator('input[name=date]')).toHaveValue('2026-10-05');
  await expect(page.locator('input[name=start]')).toHaveValue('10:00');
  await expect(page.locator('input[name=end]')).toHaveValue('17:00');
  await expect(page.locator('input[name=stay]')).toHaveValue('45');
  await expect(page.locator('select[name=count]')).toHaveValue('3');
  await expect(page.getByLabel('祝日として扱う')).not.toBeChecked();
});

test('marks national holidays automatically', async ({ page }) => {
  await openPlan(page);
  await page.locator('input[name=date]').fill('2026-10-12');
  await expect(page.getByLabel('祝日として扱う')).toBeChecked();
  await expect(page.locator('#plan-holiday-note')).toContainText('スポーツの日');
});

test('suggests up to five plans for a long day', async ({ page }) => {
  await openPlan(page);
  await page.locator('input[name=end]').fill('21:00');
  await submit(page);
  const results = page.locator('.plan-result');
  await expect(results.first()).toBeVisible();
  expect(await results.count()).toBeLessThanOrEqual(5);
  await expect(results.first().locator('.plan-stops > li')).toHaveCount(3);
  await expect(results.first()).toContainText('下呂駅に');
});

test('explains what to change when nothing fits', async ({ page }) => {
  await openPlan(page);
  await page.locator('input[name=end]').fill('10:30');
  await submit(page);
  await expect(page.locator('.no-plan')).toContainText('終了時刻を延ばす');
});

test('rejects an end time before the start time', async ({ page }) => {
  await openPlan(page);
  await page.locator('input[name=end]').fill('09:00');
  await submit(page);
  await expect(page.locator('.form-error')).toContainText('終了時刻は開始時刻より後に');
});

test('shows a plan on the map', async ({ page }) => {
  await openPlan(page);
  await page.locator('input[name=end]').fill('21:00');
  await submit(page);
  await page.getByRole('button', { name: '地図で見る' }).first().click();
  await expect(page.getByRole('tab', { name: '地図' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.route-number')).toHaveCount(3);
});

test('remembers the stay time', async ({ page }) => {
  await openPlan(page);
  await page.locator('input[name=stay]').fill('30');
  await submit(page);
  await page.reload();
  await page.getByRole('tab', { name: 'プラン' }).click();
  await expect(page.locator('input[name=stay]')).toHaveValue('30');
});

test('refreshes the default start time when the app becomes visible again', async ({ page }) => {
  await openPlan(page);
  await page.clock.setFixedTime(AFTERNOON_ON_SAME_DAY);
  await fireVisibilityChange(page);
  await expect(page.locator('input[name=start]')).toHaveValue('13:00');
});

test('keeps a manually edited start time when the app becomes visible again', async ({ page }) => {
  await openPlan(page);
  await page.locator('input[name=start]').fill('11:00');
  await page.clock.setFixedTime(AFTERNOON_ON_SAME_DAY);
  await fireVisibilityChange(page);
  await expect(page.locator('input[name=start]')).toHaveValue('11:00');
});

test('defaults an evening start with an end time three hours later', async ({ page }) => {
  await openApp(page, { now: new Date('2026-10-05T18:00:00+09:00') });
  await page.getByRole('tab', { name: 'プラン' }).click();
  await expect(page.locator('input[name=start]')).toHaveValue('18:00');
  await expect(page.locator('input[name=end]')).toHaveValue('21:00');
});

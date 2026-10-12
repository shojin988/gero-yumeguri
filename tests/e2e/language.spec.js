import { test, expect } from '@playwright/test';
import { FACILITIES, openApp } from './helpers.js';

const suimeikan = FACILITIES.find((facility) => facility.id === 'suimeikan');

test('shows Japanese on a Japanese device', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('湯めぐり手形プランナー');
  await expect(page.getByRole('button', { name: 'Switch to English' })).toHaveText('English');
});

test('shows English when the URL asks for it', async ({ page }) => {
  await openApp(page, { path: '/?lang=en' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Yumeguri Pass Planner');
  await expect(page.getByRole('tab', { name: 'List' })).toBeVisible();
  await page.getByRole('tab', { name: 'List' }).click();
  const card = page.locator(`.facility-card[data-facility-id="${suimeikan.id}"]`);
  await expect(card.locator('h3')).toHaveText('Suimeikan');
  await expect(card.locator('.card-hours')).toContainText('Pass hours: 12:00–14:00');
  await expect(card.locator('.card-notes li')).toHaveText(suimeikan.i18n.en.notes);
  await expect(card.getByRole('link', { name: 'Official site' })).toBeVisible();
  await expect(page.getByLabel('Sort by')).toHaveValue('distance');
});

test('switches language with the header button and remembers it', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page).toHaveURL(/[?&]lang=en/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Yumeguri Pass Planner');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Yumeguri Pass Planner');
  await page.getByRole('button', { name: 'Switch to Japanese' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('湯めぐり手形プランナー');
});

test('makes a plan in English', async ({ page }) => {
  await openApp(page, { path: '/?lang=en' });
  await page.getByRole('tab', { name: 'Plan' }).click();
  await page.getByRole('button', { name: 'Make a plan' }).click();
  await expect(page.locator('.plan-result h3').first()).toHaveText(/^Option 1: \d+ min of walking in total$/);
  await expect(page.locator('.plan-finish').first()).toContainText('Arrive at Gero Station at');
});

test.describe('on an English device', () => {
  test.use({ locale: 'en-US' });

  test('shows English without any setting', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Yumeguri Pass Planner');
  });
});

test('marks the language button with the language it is written in', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#language-button')).toHaveAttribute('lang', 'en');
  await page.goto('/?lang=en');
  await expect(page.locator('#language-button')).toHaveAttribute('lang', 'ja');
});

test('does not show Japanese holiday names in English', async ({ page }) => {
  await openApp(page, { path: '/?lang=en' });
  await page.getByRole('tab', { name: 'Plan' }).click();
  await page.getByLabel('Date').fill('2026-10-12');
  await expect(page.locator('#plan-holiday-note')).toHaveText('This day is a public holiday in Japan.');
});

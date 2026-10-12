import { test, expect } from '@playwright/test';
import { FACILITIES, openApp } from './helpers.js';

const suimeikan = FACILITIES.find((facility) => facility.id === 'suimeikan');

test('shows Japanese on a Japanese device', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('湯めぐり手形プランナー');
  await expect(page.getByRole('combobox', { name: '言語' })).toHaveValue('ja');
});

test('offers every language by its own name', async ({ page }) => {
  await openApp(page);
  const options = page.locator('#language-select option');
  await expect(options).toHaveText(['日本語', 'English', '繁體中文', '简体中文', '한국어']);
  await expect(page.locator('#language-select option[value="ko"]')).toHaveAttribute('lang', 'ko');
});

test('shows English when the URL asks for it', async ({ page }) => {
  await openApp(page, { path: '/?lang=en' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Yumeguri Pass Planner');
  await page.getByRole('tab', { name: 'List' }).click();
  const card = page.locator(`.facility-card[data-facility-id="${suimeikan.id}"]`);
  await expect(card.locator('h3')).toHaveText('Suimeikan');
  await expect(card.locator('.card-hours')).toContainText('Pass hours: 12:00–14:00');
  await expect(card.locator('.card-notes li')).toHaveText(suimeikan.i18n.en.notes);
  await expect(card.getByRole('link', { name: 'Official site' })).toBeVisible();
  await expect(page.getByLabel('Sort by')).toHaveValue('distance');
});

test('switches language with the header menu and remembers it', async ({ page }) => {
  await openApp(page);
  await page.getByRole('combobox', { name: '言語' }).selectOption('en');
  await expect(page).toHaveURL(/[?&]lang=en/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Yumeguri Pass Planner');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Yumeguri Pass Planner');
  await page.getByRole('combobox', { name: 'Language' }).selectOption('ja');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('湯めぐり手形プランナー');
});

test('shows Korean when the URL asks for it', async ({ page }) => {
  await openApp(page, { path: '/?lang=ko' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await page.getByRole('tab', { name: '목록' }).click();
  const card = page.locator(`.facility-card[data-facility-id="${suimeikan.id}"]`);
  await expect(card.locator('h3')).toHaveText('스이메이칸');
  await expect(card.locator('.card-hours')).toContainText('데가타 이용 시간: 12:00~14:00');
  await expect(card.locator('.card-notes li')).toHaveText(suimeikan.i18n.ko.notes);
});

test('makes a plan in English', async ({ page }) => {
  await openApp(page, { path: '/?lang=en' });
  await page.getByRole('tab', { name: 'Plan' }).click();
  await page.getByRole('button', { name: 'Make a plan' }).click();
  await expect(page.locator('.plan-result h3').first()).toHaveText(/^Option 1: \d+ min of walking in total$/);
  await expect(page.locator('.plan-finish').first()).toContainText('Arrive at Gero Station at');
});

test('does not show Japanese holiday names in English', async ({ page }) => {
  await openApp(page, { path: '/?lang=en' });
  await page.getByRole('tab', { name: 'Plan' }).click();
  await page.getByLabel('Date').fill('2026-10-12');
  await expect(page.locator('#plan-holiday-note')).toHaveText('This day is a public holiday in Japan.');
});

test.describe('on an English device', () => {
  test.use({ locale: 'en-US' });

  test('shows English without any setting', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Yumeguri Pass Planner');
  });
});

test.describe('on a Taiwanese device', () => {
  test.use({ locale: 'zh-TW' });

  test('shows Traditional Chinese without any setting', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('湯巡手形規劃');
  });
});

test.describe('on a mainland Chinese device', () => {
  test.use({ locale: 'zh-CN' });

  test('shows Simplified Chinese without any setting', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('汤巡手形规划');
    await page.getByRole('tab', { name: '列表' }).click();
    await expect(page.locator(`.facility-card[data-facility-id="${suimeikan.id}"] h3`)).toHaveText('水明馆');
  });
});

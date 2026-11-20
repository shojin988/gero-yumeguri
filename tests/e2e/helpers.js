import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';

export const FACILITIES = JSON.parse(
  readFileSync(new URL('../../data/facilities.json', import.meta.url), 'utf8'),
).facilities;

// 2026-10-05 は祝日でない月曜日
export const MONDAY_10AM = new Date('2026-10-05T10:00:00+09:00');

export const CONGESTION_URL = 'https://kk-congestion-saas.antipasto.jp/json/GERO.json';

const SHOPS_FIXTURE = readFileSync(new URL('./fixtures/shops.json', import.meta.url), 'utf8');

// 既定では混雑データは取れない扱いにして、時刻からの判定だけで動く画面を確かめる。
// 飲食店はテスト用の3軒（fixtures/shops.json）に固定し、shops: 'fail' で読み込み失敗にする。
// savedCategories を渡すと、開く前に「表示する種類」を保存しておく（温泉のピンが出ない場合は待たない）。
export async function openApp(page, { now = MONDAY_10AM, congestion = null, path = '/', shops = 'fixture', savedCategories = null } = {}) {
  if (savedCategories !== null) {
    await page.addInitScript((value) => localStorage.setItem('gero-yumeguri:categories:v1', value), JSON.stringify(savedCategories));
  }
  await page.route('**/data/shops.json', (route) => (shops === 'fail'
    ? route.abort()
    : route.fulfill({ status: 200, contentType: 'application/json', body: SHOPS_FIXTURE })));
  await page.route(CONGESTION_URL, (route) => (congestion
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(congestion) })
    : route.abort()));
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.route('https://www.google.com/maps/embed**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>street view</p>' }));
  await page.clock.setFixedTime(now);
  await page.goto(path);
  if (savedCategories === null || savedCategories.includes('onsen')) {
    await expect(page.locator('.pin')).toHaveCount(FACILITIES.length);
  }
}

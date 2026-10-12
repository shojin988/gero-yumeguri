import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';

export const FACILITIES = JSON.parse(
  readFileSync(new URL('../../data/facilities.json', import.meta.url), 'utf8'),
).facilities;

// 2026-10-05 は祝日でない月曜日
export const MONDAY_10AM = new Date('2026-10-05T10:00:00+09:00');

export const CONGESTION_URL = 'https://kk-congestion-saas.antipasto.jp/json/GERO.json';

// 既定では混雑データは取れない扱いにして、時刻からの判定だけで動く画面を確かめる
export async function openApp(page, { now = MONDAY_10AM, congestion = null, path = '/' } = {}) {
  await page.route(CONGESTION_URL, (route) => (congestion
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(congestion) })
    : route.abort()));
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.route('https://www.google.com/maps/embed**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>street view</p>' }));
  await page.clock.setFixedTime(now);
  await page.goto(path);
  await expect(page.locator('.pin')).toHaveCount(FACILITIES.length);
}

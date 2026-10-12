import { test, expect } from '@playwright/test';
import { FACILITIES, openApp } from './helpers.js';

const byId = (id) => FACILITIES.find((facility) => facility.id === id);

function congestionFor(entries) {
  return {
    congestion_list: entries.flatMap(([id, labels]) => byId(id).congestionPlaceIds.map((placeId, index) => ({
      place_name: `${byId(id).name} ${index === 0 ? '女湯' : '男湯'}`,
      place_id: placeId,
      congestion: labels[index],
      last_update: '2026-10-05T00:55:00+00:00',
    }))),
  };
}

async function openList(page, options) {
  await openApp(page, options);
  await page.getByRole('tab', { name: '一覧' }).click();
}

test('shows the live congestion of each bath on the card', async ({ page }) => {
  await openList(page, { congestion: congestionFor([['kurgarten', ['やや混雑', '空き']]]) });
  const card = page.locator('.facility-card[data-facility-id="kurgarten"]');
  await expect(card.locator('.live-heading')).toHaveText(/公式の混雑状況（10:00 取得）/);
  await expect(card.locator('.live-chip')).toHaveText(['男湯 空き', '女湯 やや混雑']);
  await expect(card.locator('.live-heading')).toHaveAttribute('href', 'https://vista.kohnan.kitchen/#/gero_top');
});

test('leaves out open facilities that refuse guests when filtering', async ({ page }) => {
  await openList(page, { congestion: congestionFor([['kurgarten', ['入浴不可', '大変混雑']]]) });
  await expect(page.locator('.facility-card[data-facility-id="kurgarten"]')).toHaveCount(1);
  await page.getByLabel('今から入れる施設だけ').check();
  await expect(page.locator('.facility-card[data-facility-id="kurgarten"]')).toHaveCount(0);
  await expect(page.locator('.facility-card[data-facility-id="shirasagi-no-yu"]')).toHaveCount(1);
});

test('hides congestion when it cannot be read', async ({ page }) => {
  await openList(page);
  await expect(page.locator('.facility-card')).toHaveCount(FACILITIES.length);
  await expect(page.locator('.card-live')).toHaveCount(0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDayContext } from '../../js/hours.js';
import { buildShopItems, shopStatus } from '../../js/shop-items.js';
import { HOLIDAYS, STATION, makeShop } from './fixtures.js';

const MONDAY = buildDayContext('2026-10-05', HOLIDAYS);
// 2026-10-12 は月曜の祝日（スポーツの日）
const SPORTS_DAY = buildDayContext('2026-10-12', HOLIDAYS);
const range = (start, end, lastEntry = null) => ({ start, end, lastEntry });

test('shopStatus respects last order', () => {
  const windows = [range(660, 900, 870)]; // 11:00-15:00 LO14:30
  assert.equal(shopStatus(windows, 600), 'later');
  assert.equal(shopStatus(windows, 660), 'open');
  assert.equal(shopStatus(windows, 870), 'open');
  assert.equal(shopStatus(windows, 871), 'closed');
});

test('shopStatus finds an evening window after lunch', () => {
  assert.equal(shopStatus([range(660, 840), range(1020, 1260)], 900), 'later');
});

test('shopStatus handles midnight closing', () => {
  assert.equal(shopStatus([range(1080, 1440)], 1430), 'open');
  assert.equal(shopStatus([range(1080, 1440)], 1440), 'closed');
});

test('shopStatus is closed without any window', () => {
  assert.equal(shopStatus([], 700), 'closed');
});

test('buildShopItems computes walk, status and category', () => {
  const [item] = buildShopItems({ shops: [makeShop('a')], day: MONDAY, now: 700, origin: STATION });
  assert.equal(item.category, 'food');
  assert.equal(item.shop.id, 'a');
  assert.equal(item.walk, 2);
  assert.equal(item.status, 'open');
  assert.deepEqual(item.windows, [range(660, 900, 870)]);
});

test('buildShopItems judges by the arrival time after walking', () => {
  // 14:29 に出ても徒歩2分で 14:31 に着くので、ラストオーダーに間に合わない
  const [item] = buildShopItems({ shops: [makeShop('a')], day: MONDAY, now: 869, origin: STATION });
  assert.equal(item.status, 'closed');
});

test('buildShopItems treats unlisted days as closed and uses the holiday rule', () => {
  const shop = makeShop('weekend', { days: ['sat', 'sun', 'hol'] });
  const [monday] = buildShopItems({ shops: [shop], day: MONDAY, now: 700, origin: STATION });
  assert.equal(monday.status, 'closed');
  assert.deepEqual(monday.windows, []);
  const [holiday] = buildShopItems({ shops: [shop], day: SPORTS_DAY, now: 700, origin: STATION });
  assert.equal(holiday.status, 'open');
});

test('buildShopItems marks shops without verified hours as unknown', () => {
  const [item] = buildShopItems({ shops: [makeShop('u', { schedule: null })], day: MONDAY, now: 700, origin: STATION });
  assert.equal(item.status, 'unknown');
  assert.equal(item.windows, null);
  assert.equal(item.walk, 2);
});

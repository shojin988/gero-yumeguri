import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDayContext } from '../../js/hours.js';
import { CUISINES, buildShopItems } from '../../js/shop-items.js';
import {
  DEFAULT_SHOP_FILTER, EVENING_FROM, SHOP_GROUPS, filterShopItems, isOpenInEvening, matchesGroup,
} from '../../js/shop-filter.js';
import { HOLIDAYS, STATION, makeShop } from './fixtures.js';

const range = (start, end, lastEntry = null) => ({ start, end, lastEntry });
const item = (id, cuisine, windows) => ({ category: 'food', shop: makeShop(id, { cuisine }), windows, walk: 2, status: 'later' });
const ids = (items) => items.map((entry) => entry.shop.id);

test('evening starts at 19:00', () => {
  assert.equal(EVENING_FROM, 1140);
});

test('every cuisine except other belongs to exactly one group', () => {
  for (const cuisine of CUISINES.filter((id) => id !== 'other')) {
    assert.equal(SHOP_GROUPS.filter((group) => group.cuisines?.includes(cuisine)).length, 1, cuisine);
  }
});

test('groups keep the agreed order', () => {
  assert.deepEqual(SHOP_GROUPS.map((group) => group.id), ['all', 'japanese', 'noodles', 'sushi', 'yakiniku', 'izakaya', 'western', 'chinese', 'curry']);
  for (const group of SHOP_GROUPS) {
    assert.equal(group.labelKey, `cuisineGroup.${group.id}`);
  }
});

test('matchesGroup puts a shop with several cuisines in each of its groups', () => {
  const shop = makeShop('a', { cuisine: ['izakaya', 'yakiniku'] });
  assert.equal(matchesGroup(shop, 'izakaya'), true);
  assert.equal(matchesGroup(shop, 'yakiniku'), true);
  assert.equal(matchesGroup(shop, 'japanese'), false);
  assert.equal(matchesGroup(shop, 'all'), true);
});

test('other appears only under all', () => {
  const shop = makeShop('a', { cuisine: ['other'] });
  assert.deepEqual(SHOP_GROUPS.filter((group) => matchesGroup(shop, group.id)).map((group) => group.id), ['all']);
});

test('isOpenInEvening prefers last order over closing time', () => {
  assert.equal(isOpenInEvening([range(1020, 1200, 1140)]), false);
  assert.equal(isOpenInEvening([range(1020, 1200, 1170)]), true);
  assert.equal(isOpenInEvening([range(1020, 1200)]), true);
});

test('isOpenInEvening excludes closing exactly at 19:00', () => {
  assert.equal(isOpenInEvening([range(660, 1140)]), false);
  assert.equal(isOpenInEvening([range(660, 1141)]), true);
});

test('isOpenInEvening checks every window of the day', () => {
  assert.equal(isOpenInEvening([range(660, 840), range(1020, 1260)]), true);
});

test('isOpenInEvening is false for unknown hours and days off', () => {
  assert.equal(isOpenInEvening(null), false);
  assert.equal(isOpenInEvening([]), false);
});

test('filterShopItems combines group and evening', () => {
  const items = [
    item('soba-lunch', ['soba'], [range(570, 900, 870)]),
    item('izakaya-night', ['izakaya'], [range(1020, 1380, 1350)]),
    item('japanese-night', ['japanese'], [range(1020, 1260)]),
    item('izakaya-unknown', ['izakaya'], null),
  ];
  assert.deepEqual(ids(filterShopItems(items, DEFAULT_SHOP_FILTER)), ['soba-lunch', 'izakaya-night', 'japanese-night', 'izakaya-unknown']);
  assert.deepEqual(ids(filterShopItems(items, { group: 'all', eveningOnly: true })), ['izakaya-night', 'japanese-night']);
  assert.deepEqual(ids(filterShopItems(items, { group: 'izakaya', eveningOnly: false })), ['izakaya-night', 'izakaya-unknown']);
  assert.deepEqual(ids(filterShopItems(items, { group: 'izakaya', eveningOnly: true })), ['izakaya-night']);
});

test('evening uses the holiday schedule like the status does', () => {
  const shop = makeShop('a', {
    schedule: [
      { days: ['mon'], windows: [{ start: '11:00', end: '14:00' }] },
      { days: ['hol'], windows: [{ start: '17:00', end: '22:00' }] },
    ],
  });
  const eveningIds = (dateKey) => ids(filterShopItems(
    buildShopItems({ shops: [shop], day: buildDayContext(dateKey, HOLIDAYS), now: 600, origin: STATION }),
    { group: 'all', eveningOnly: true },
  ));
  // 2026-10-12 は月曜の祝日、2026-10-05 はふつうの月曜
  assert.deepEqual(eveningIds('2026-10-12'), ['a']);
  assert.deepEqual(eveningIds('2026-10-05'), []);
});

test('DEFAULT_SHOP_FILTER shows everything', () => {
  assert.deepEqual(DEFAULT_SHOP_FILTER, { group: 'all', eveningOnly: false });
  assert.equal(Object.isFrozen(DEFAULT_SHOP_FILTER), true);
});

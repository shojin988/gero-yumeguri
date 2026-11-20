import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SHOP_CATEGORY_IDS } from '../../js/categories.js';
import { distanceMeters } from '../../js/geo.js';
import { parseHm } from '../../js/hours.js';
import { CUISINES } from '../../js/shop-items.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const data = JSON.parse(read('data/shops.json'));
const sources = read('data/sources.md');

const DAY_TYPES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'hol'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const GERO_BOUNDS = { minLat: 35.78, maxLat: 35.83, minLng: 137.22, maxLng: 137.27 };
const ID = /^(osm-(node|way|relation)-\d+|local-[a-z0-9-]+)$/;
const NAME_LANGUAGES = ['en', 'zh-Hant', 'zh-Hans', 'ko'];
const MAPS_PREFIX = 'https://www.google.com/maps/search/?api=1&query=';
// 同じ建物に入る店でも、座標はそれぞれの入口に置く
const MIN_SEPARATION_METERS = 1;

const inGero = ({ lat, lng }) => typeof lat === 'number' && typeof lng === 'number'
  && lat >= GERO_BOUNDS.minLat && lat <= GERO_BOUNDS.maxLat
  && lng >= GERO_BOUNDS.minLng && lng <= GERO_BOUNDS.maxLng;

test('top-level fields', () => {
  assert.match(data.checkedOn, DATE);
  assert.ok(Array.isArray(data.shops));
});

test('ids are unique', () => {
  const ids = data.shops.map((shop) => shop.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('gives every shop its own coordinates', () => {
  data.shops.forEach((a, index) => {
    for (const b of data.shops.slice(index + 1)) {
      assert.ok(distanceMeters(a, b) >= MIN_SEPARATION_METERS, `${a.id} and ${b.id} share coordinates`);
    }
  });
});

for (const shop of data.shops) {
  test(`${shop.id}: basic fields`, () => {
    assert.match(shop.id, ID);
    const osmId = /^osm-(node|way|relation)-(\d+)$/.exec(shop.id);
    assert.equal(shop.osm, osmId ? `${osmId[1]}/${osmId[2]}` : null);
    assert.ok(SHOP_CATEGORY_IDS.includes(shop.category), `unknown category ${shop.category}`);
    assert.ok(typeof shop.name === 'string' && shop.name.length > 0);
    if (shop.names !== undefined) {
      for (const [language, name] of Object.entries(shop.names)) {
        assert.ok(NAME_LANGUAGES.includes(language), `unknown name language ${language}`);
        assert.ok(typeof name === 'string' && name.length > 0);
      }
    }
    assert.ok(Array.isArray(shop.cuisine) && shop.cuisine.length > 0);
    for (const cuisine of shop.cuisine) {
      assert.ok(CUISINES.includes(cuisine), `unknown cuisine ${cuisine}`);
    }
    assert.ok(inGero(shop), 'lat/lng must be inside Gero');
    assert.equal(typeof shop.irregularClosure, 'boolean');
    assert.ok(shop.officialUrl === null || shop.officialUrl.startsWith('https://'));
    assert.ok(shop.mapsUrl.startsWith(MAPS_PREFIX));
    assert.ok(sources.includes(shop.id), 'data/sources.md must mention the shop id');
  });

  test(`${shop.id}: hours`, () => {
    assert.equal(shop.schedule === null, shop.hoursSource === null, 'schedule and hoursSource go together');
    if (shop.schedule === null) {
      return;
    }
    assert.ok(shop.hoursSource.startsWith('https://'));
    const seen = new Set();
    for (const rule of shop.schedule) {
      for (const day of rule.days) {
        assert.ok(DAY_TYPES.includes(day), `unknown day ${day}`);
        assert.ok(!seen.has(day), `${day} appears in two rules`);
        seen.add(day);
      }
      assert.ok(rule.windows.length > 0);
      for (const window of rule.windows) {
        const start = parseHm(window.start);
        const end = parseHm(window.end);
        assert.ok(start < end, `${window.start} must be before ${window.end}`);
        if (window.lastEntry !== undefined) {
          const lastEntry = parseHm(window.lastEntry);
          assert.ok(lastEntry >= start && lastEntry <= end, `last order ${window.lastEntry} must be within the window`);
        }
      }
    }
  });
}

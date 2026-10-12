import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHm } from '../../js/hours.js';
import { distanceMeters } from '../../js/geo.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const data = JSON.parse(read('data/facilities.json'));
const sources = read('data/sources.md');

const DAY_TYPES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'hol'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const GERO_BOUNDS = { minLat: 35.78, maxLat: 35.83, minLng: 137.22, maxLng: 137.27 };
// 公式の手形ページ（2025年10月1日現在）の加盟施設数。公式が変わったらここも直す。
const EXPECTED_FACILITY_COUNT = 18;
const MAX_NON_WALKABLE_METERS = 20000;
const STREET_VIEW_URL = /^https:\/\/www\.google\.com\/maps\/embed\?pb=!6m8!1m7!1s[A-Za-z0-9_-]+!2m2!1d(-?\d+(?:\.\d+)?)!2d(-?\d+(?:\.\d+)?)!3f\d+(?:\.\d+)?!4f-?\d+(?:\.\d+)?!5f\d+(?:\.\d+)?$/;
const MAX_STREET_VIEW_METERS = 120;
// 翻訳の文字に、その言語では使わない文字（かな・漢字・ハングル）が混ざっていないかを確かめる
const FORBIDDEN_SCRIPTS = {
  en: /[぀-ヿ一-鿿가-힯]/,
  'zh-Hant': /[぀-ヿ가-힯]/,
  'zh-Hans': /[぀-ヿ가-힯]/,
  ko: /[぀-ヿ一-鿿]/,
};

const inGero = ({ lat, lng }) => typeof lat === 'number' && typeof lng === 'number'
  && lat >= GERO_BOUNDS.minLat && lat <= GERO_BOUNDS.maxLat
  && lng >= GERO_BOUNDS.minLng && lng <= GERO_BOUNDS.maxLng;

test('top-level fields', () => {
  assert.match(data.checkedOn, DATE);
  assert.equal('tegata' in data, false, 'the public version keeps no pass price');
  assert.equal(data.places.geroStation.name, '下呂駅');
  assert.deepEqual(
    Object.fromEntries(Object.entries(data.places.geroStation.i18n).map(([language, place]) => [language, place.name])),
    { en: 'Gero Station', 'zh-Hant': '下呂站', 'zh-Hans': '下吕站', ko: '게로역' },
  );
  assert.ok(inGero(data.places.geroStation), 'station must be inside Gero');
});

test('lists every facility once', () => {
  assert.equal(data.facilities.length, EXPECTED_FACILITY_COUNT);
  const ids = data.facilities.map((facility) => facility.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('never shares a congestion place id between facilities', () => {
  const ids = data.facilities.flatMap((facility) => facility.congestionPlaceIds);
  assert.equal(new Set(ids).size, ids.length);
});

test('gives every facility its own coordinates', () => {
  const coords = data.facilities.map((facility) => `${facility.lat},${facility.lng}`);
  assert.equal(new Set(coords).size, data.facilities.length, 'two facilities share the same coordinates');
});

for (const facility of data.facilities) {
  test(`${facility.id}: basic fields`, () => {
    assert.match(facility.id, /^[a-z0-9-]+$/);
    assert.ok(facility.name.length > 0);
    assert.ok(facility.walkable === undefined || facility.walkable === false, 'walkable is either omitted or false');
    if (facility.walkable === false) {
      assert.ok(
        distanceMeters(facility, data.places.geroStation) <= MAX_NON_WALKABLE_METERS,
        'non-walkable facility must be within 20 km of the station',
      );
    } else {
      assert.ok(inGero(facility), 'lat/lng must be inside Gero');
    }
    assert.match(facility.officialUrl, /^https:\/\//);
    assert.match(facility.mapsUrl, /^https:\/\//);
    assert.ok(Array.isArray(facility.notes) && facility.notes.every((note) => typeof note === 'string'));
    assert.ok(sources.includes(facility.name), 'data/sources.md must mention the facility');
  });

  for (const [language, forbidden] of Object.entries(FORBIDDEN_SCRIPTS)) {
    test(`${facility.id}: ${language} text`, () => {
      const translated = facility.i18n?.[language];
      assert.ok(translated && translated.name.length > 0, `needs a ${language} name`);
      assert.equal(translated.notes.length, facility.notes.length, `needs one ${language} note per note`);
      for (const text of [translated.name, ...translated.notes]) {
        assert.equal(forbidden.test(text), false, `not ${language}: ${text}`);
      }
    });
  }

  test(`${facility.id}: congestion place ids`, () => {
    assert.ok(Array.isArray(facility.congestionPlaceIds));
    assert.ok(facility.congestionPlaceIds.length >= 1 && facility.congestionPlaceIds.length <= 2);
    assert.ok(facility.congestionPlaceIds.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)));
  });

  test(`${facility.id}: no price fields`, () => {
    assert.equal('regularPrice' in facility, false);
    assert.equal('regularPriceNote' in facility, false);
    assert.ok(facility.notes.every((note) => !/円|料金/.test(note)), 'notes must not mention prices');
  });

  test(`${facility.id}: schedule`, () => {
    assert.ok(facility.schedule.length > 0);
    const seen = new Set();
    for (const rule of facility.schedule) {
      assert.ok(rule.days.length > 0);
      for (const dayType of rule.days) {
        assert.ok(DAY_TYPES.includes(dayType), dayType);
        assert.ok(!seen.has(dayType), `${dayType} appears in two rules`);
        seen.add(dayType);
      }
      assert.ok(rule.windows.length > 0);
      for (const range of rule.windows) {
        const start = parseHm(range.start);
        const end = parseHm(range.end);
        assert.ok(start < end, `${range.start} < ${range.end}`);
        if (range.lastEntry !== undefined) {
          const lastEntry = parseHm(range.lastEntry);
          assert.ok(lastEntry > start && lastEntry <= end, `lastEntry ${range.lastEntry}`);
        }
      }
    }
  });

  test(`${facility.id}: street view`, () => {
    assert.ok(Object.hasOwn(facility, 'streetViewUrl'), 'streetViewUrl must be present (string or null)');
    if (facility.streetViewUrl === null) {
      return;
    }
    const match = STREET_VIEW_URL.exec(facility.streetViewUrl);
    assert.ok(match, `unexpected street view URL: ${facility.streetViewUrl}`);
    const pano = { lat: Number(match[1]), lng: Number(match[2]) };
    assert.ok(distanceMeters(pano, facility) <= MAX_STREET_VIEW_METERS, 'panorama must be near the facility');
  });

  test(`${facility.id}: closures`, () => {
    assert.equal(typeof facility.closedBeforeHoliday, 'boolean');
    for (const period of facility.closedPeriods) {
      assert.match(period.from, MONTH_DAY);
      assert.match(period.to, MONTH_DAY);
      assert.ok(period.label.length > 0);
    }
  });
}

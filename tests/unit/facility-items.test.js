import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDayContext } from '../../js/hours.js';
import { buildFacilityItems, filterItems, sortItems } from '../../js/facility-items.js';
import { HOLIDAYS, STATION, makeFacility } from './fixtures.js';

const MONDAY = buildDayContext('2026-10-05', HOLIDAYS);

test('buildFacilityItems computes walk and status without any price', () => {
  const facilities = [
    makeFacility('open-now', { lat: 35.801, windows: [['10:00', '10:40']] }),
    makeFacility('later-today', { lat: 35.801, windows: [['11:00', '12:00']] }),
    makeFacility('weekend-only', { days: ['sat', 'sun', 'hol'] }),
  ];
  const items = buildFacilityItems({ facilities, day: MONDAY, now: 600, origin: STATION, stay: 30 });
  assert.deepEqual(items.map((item) => item.status), ['open', 'later', 'closed']);
  assert.equal(items[0].walk, 2);
  assert.deepEqual(items[0].windows, [{ start: 600, end: 640, lastEntry: null }]);
  assert.equal('savings' in items[0], false);
});

test('buildFacilityItems gives no walk time to facilities out of walking range', () => {
  const facilities = [makeFacility('by-car', { lat: 35.801, windows: [['10:00', '10:40']], walkable: false })];
  const [item] = buildFacilityItems({ facilities, day: MONDAY, now: 600, origin: STATION, stay: 30 });
  assert.equal(item.walk, null);
  assert.equal(item.status, 'open');
});

const sample = [
  { facility: { name: 'あ' }, walk: 5, status: 'open' },
  { facility: { name: 'い' }, walk: 2, status: 'later' },
  { facility: { name: 'う' }, walk: 2, status: 'open' },
];
const names = (items) => items.map((item) => item.facility.name);

test('sortItems orders by distance and name, and falls back to distance', () => {
  assert.deepEqual(names(sortItems(sample, 'distance')), ['い', 'う', 'あ']);
  assert.deepEqual(names(sortItems(sample, 'name')), ['あ', 'い', 'う']);
  assert.deepEqual(names(sortItems(sample, 'savings')), ['い', 'う', 'あ']);
  assert.deepEqual(names(sortItems(sample, 'unknown')), ['い', 'う', 'あ']);
});

test('sortItems puts facilities without a walk time last when sorting by distance', () => {
  const items = [
    { facility: { name: 'え' }, walk: null, status: 'open' },
    ...sample,
  ];
  assert.deepEqual(names(sortItems(items, 'distance')), ['い', 'う', 'あ', 'え']);
});

test('sortItems does not change the input', () => {
  sortItems(sample, 'name');
  assert.deepEqual(names(sample), ['あ', 'い', 'う']);
});

test('filterItems keeps only open facilities when asked', () => {
  assert.deepEqual(names(filterItems(sample, { openOnly: true })), ['あ', 'う']);
  assert.equal(filterItems(sample, { openOnly: false }).length, 3);
});

test('buildFacilityItems attaches the live congestion of each facility', () => {
  const facilities = [
    { ...makeFacility('live', { windows: [['10:00', '12:00']] }), congestionPlaceIds: ['m', 'f'] },
    { ...makeFacility('no-data'), congestionPlaceIds: ['x'] },
  ];
  const places = new Map([
    ['f', { bath: 'female', level: 'busy', label: 'やや混雑' }],
    ['m', { bath: 'male', level: 'vacant', label: '空き' }],
  ]);
  const items = buildFacilityItems({ facilities, day: MONDAY, now: 600, origin: STATION, stay: 30, congestion: places });
  assert.deepEqual(items[0].live.map((bath) => bath.level), ['vacant', 'busy']);
  assert.equal(items[1].live, null);
  const withoutData = buildFacilityItems({ facilities, day: MONDAY, now: 600, origin: STATION, stay: 30 });
  assert.equal(withoutData[0].live, null);
});

test('filterItems also drops open facilities that refuse guests right now', () => {
  const items = [
    { facility: { name: 'か' }, walk: 1, status: 'open', live: [{ level: 'unavailable' }, { level: 'full' }] },
    { facility: { name: 'き' }, walk: 1, status: 'open', live: [{ level: 'crowded' }] },
    { facility: { name: 'く' }, walk: 1, status: 'open', live: null },
  ];
  assert.deepEqual(names(filterItems(items, { openOnly: true })), ['き', 'く']);
  assert.equal(filterItems(items, { openOnly: false }).length, 3);
});

test('filterItems keeps a facility when only some of its baths are known to refuse guests', () => {
  const items = [{ facility: { name: 'け', congestionPlaceIds: ['m', 'f'] }, walk: 1, status: 'open', live: [{ level: 'unavailable' }] }];
  assert.equal(filterItems(items, { openOnly: true }).length, 1);
});

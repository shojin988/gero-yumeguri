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

// 公式の混雑状況を正とする。時刻表で入れない日でも、公式が「空き」なら入れる。
function itemWith(levels, { windows = [['09:00', '21:00']], days } = {}) {
  const ids = levels.map((_, index) => `id${index}`);
  const facility = { ...makeFacility('f', { windows, ...(days ? { days } : {}) }), congestionPlaceIds: ids };
  const places = new Map(levels.map((level, index) => [ids[index], { bath: index === 0 ? 'male' : 'female', level, label: level }]));
  return buildFacilityItems({ facilities: [facility], day: MONDAY, now: 600, origin: STATION, stay: 30, congestion: places })[0];
}

test('the official status opens a facility the timetable says is closed today', () => {
  const item = itemWith(['vacant', 'vacant'], { days: ['sat', 'sun', 'hol'] });
  assert.equal(item.scheduleStatus, 'closed');
  assert.equal(item.status, 'open');
  assert.equal(item.followsLive, true);
});

test('any bath taking guests makes the facility open now', () => {
  assert.equal(itemWith(['crowded', 'unavailable'], { windows: [['18:00', '20:00']] }).status, 'open');
});

test('every bath refusing guests pauses the facility', () => {
  const item = itemWith(['unavailable', 'full']);
  assert.equal(item.status, 'paused');
  assert.equal(item.followsLive, true);
});

test('outside pass hours in the official status closes a facility the timetable says is open', () => {
  assert.equal(itemWith(['closed', 'closed']).status, 'closed');
  assert.equal(itemWith(['closed', 'closed'], { windows: [['09:00', '10:30'], ['18:00', '20:00']] }).status, 'later');
});

test('partial or unknown official data leaves the timetable status', () => {
  const half = buildFacilityItems({
    facilities: [{ ...makeFacility('g'), congestionPlaceIds: ['a', 'b'] }],
    day: MONDAY,
    now: 600,
    origin: STATION,
    stay: 30,
    congestion: new Map([['a', { bath: 'male', level: 'unavailable', label: '入浴不可' }]]),
  })[0];
  assert.equal(half.status, 'open');
  assert.equal(half.followsLive, false);
  assert.equal(itemWith(['unknown', 'unknown']).status, 'open');
});

test('filterItems keeps only facilities that are open now', () => {
  const items = [
    { facility: { name: 'か' }, walk: 1, status: 'paused' },
    { facility: { name: 'き' }, walk: 1, status: 'open' },
  ];
  assert.deepEqual(names(filterItems(items, { openOnly: true })), ['き']);
});

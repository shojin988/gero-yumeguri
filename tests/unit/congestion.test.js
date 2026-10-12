import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONGESTION_LEVELS, blocksEntry, congestionFor, createCongestionLoader, parseCongestion,
} from '../../js/congestion.js';

const MALE = '00000000-0000-0000-0000-000000000001';
const FEMALE = '00000000-0000-0000-0000-000000000002';
const SINGLE = '00000000-0000-0000-0000-000000000003';

function entry(placeId, placeName, congestion) {
  return { place_name: placeName, place_id: placeId, congestion, last_update: '2026-10-05T01:00:00+00:00' };
}

const SAMPLE = {
  congestion_list: [
    entry(FEMALE, 'テスト館 女湯', 'やや混雑'),
    entry(MALE, 'テスト館 男湯', '空き'),
    entry(SINGLE, '貸切の宿', '入浴不可'),
  ],
};

test('maps every official label to a level', () => {
  assert.deepEqual(CONGESTION_LEVELS, {
    空き: 'vacant',
    やや混雑: 'busy',
    混雑: 'crowded',
    大変混雑: 'full',
    入浴不可: 'unavailable',
    利用時間外: 'closed',
  });
});

test('parseCongestion keys each bath by place id and reads which bath it is', () => {
  const places = parseCongestion(SAMPLE);
  assert.deepEqual(places.get(MALE), { bath: 'male', level: 'vacant', label: '空き' });
  assert.deepEqual(places.get(FEMALE), { bath: 'female', level: 'busy', label: 'やや混雑' });
  assert.deepEqual(places.get(SINGLE), { bath: null, level: 'unavailable', label: '入浴不可' });
});

test('parseCongestion keeps unknown labels as they are', () => {
  const places = parseCongestion({ congestion_list: [entry(MALE, 'テスト館 男湯', '清掃中')] });
  assert.deepEqual(places.get(MALE), { bath: 'male', level: 'unknown', label: '清掃中' });
});

test('parseCongestion rejects data without a congestion list', () => {
  assert.throws(() => parseCongestion({}), /congestion_list/);
  assert.throws(() => parseCongestion(null), /congestion_list/);
});

test('parseCongestion skips malformed entries', () => {
  const places = parseCongestion({ congestion_list: [{ place_id: MALE }, null, entry(FEMALE, 'テスト館 女湯', '混雑')] });
  assert.equal(places.size, 1);
  assert.equal(places.get(FEMALE).level, 'crowded');
});

test('congestionFor lists the male bath first and ignores unknown ids', () => {
  const places = parseCongestion(SAMPLE);
  const baths = congestionFor({ congestionPlaceIds: [FEMALE, MALE, 'missing'] }, places);
  assert.deepEqual(baths.map((bath) => bath.bath), ['male', 'female']);
});

test('congestionFor returns null when nothing is known', () => {
  const places = parseCongestion(SAMPLE);
  assert.equal(congestionFor({ congestionPlaceIds: ['missing'] }, places), null);
  assert.equal(congestionFor({ congestionPlaceIds: [MALE] }, null), null);
  assert.equal(congestionFor({}, places), null);
});

test('blocksEntry is true only when every bath refuses guests', () => {
  assert.equal(blocksEntry([{ level: 'unavailable' }, { level: 'full' }]), true);
  assert.equal(blocksEntry([{ level: 'unavailable' }, { level: 'vacant' }]), false);
  assert.equal(blocksEntry([{ level: 'closed' }]), false);
  assert.equal(blocksEntry(null), false);
  assert.equal(blocksEntry([]), false);
});

test('blocksEntry does not decide from only some of the baths', () => {
  assert.equal(blocksEntry([{ level: 'unavailable' }], 2), false);
  assert.equal(blocksEntry([{ level: 'unavailable' }, { level: 'full' }], 2), true);
});

test('parseCongestion treats inherited object keys as unknown labels', () => {
  const places = parseCongestion({ congestion_list: [entry(MALE, 'テスト館 男湯', 'constructor'), entry(FEMALE, 'テスト館 女湯', '__proto__')] });
  assert.equal(places.get(MALE).level, 'unknown');
  assert.equal(places.get(FEMALE).level, 'unknown');
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

function loaderWith(responses, { clock = { now: 0 } } = {}) {
  const updates = [];
  const refresh = createCongestionLoader({
    load: () => responses.shift().promise,
    onUpdate: (value) => updates.push(value),
    now: () => clock.now,
    keepForMs: 15 * 60_000,
    warn: () => {},
  });
  return { refresh, updates, clock };
}

test('the loader ignores a slower, older response', async () => {
  const first = deferred();
  const second = deferred();
  const { refresh, updates } = loaderWith([first, second]);
  const older = refresh();
  const newer = refresh();
  second.resolve('new');
  await newer;
  first.resolve('old');
  await older;
  assert.deepEqual(updates.map((update) => update.places), ['new']);
});

test('the loader keeps the last good data for a while after a failure', async () => {
  const ok = deferred();
  const failSoon = deferred();
  const failLater = deferred();
  const { refresh, updates, clock } = loaderWith([ok, failSoon, failLater]);
  ok.resolve('good');
  await refresh();
  clock.now = 10 * 60_000;
  failSoon.reject(new Error('network'));
  await refresh();
  assert.equal(updates.length, 1);
  clock.now = 16 * 60_000;
  failLater.reject(new Error('network'));
  await refresh();
  assert.deepEqual(updates.map((update) => update?.places ?? null), ['good', null]);
});

test('the loader reports when the data was read', async () => {
  const ok = deferred();
  const { refresh, updates, clock } = loaderWith([ok]);
  clock.now = 1234;
  ok.resolve('data');
  await refresh();
  assert.deepEqual(updates, [{ places: 'data', fetchedAt: 1234 }]);
});

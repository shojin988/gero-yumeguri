import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import * as format from '../../js/format.js';
import { formatLive, formatLiveHeading, formatWalk, formatWindows, statusLabel } from '../../js/format.js';
import { setLanguage } from '../../js/i18n.js';

afterEach(() => setLanguage('ja'));

test('format.js no longer exports any price helpers', () => {
  for (const name of ['formatYen', 'formatSavings', 'formatPrice']) {
    assert.equal(name in format, false, name + ' should be removed');
  }
});

test('formatWindows lists windows with last entry', () => {
  const windows = [{ start: 750, end: 840, lastEntry: 810 }, { start: 1080, end: 1200, lastEntry: null }];
  assert.equal(formatWindows(windows), '12:30〜14:00（最終受付13:30）、18:00〜20:00');
  assert.equal(formatWindows([]), '今日は手形で入れません');
});

test('formatWalk names the starting point', () => {
  assert.equal(formatWalk(7, '現在地'), '現在地から徒歩 約7分（目安）');
  assert.equal(formatWalk(null, '現在地'), '徒歩圏外（車・送迎）');
});

test('statusLabel names every status', () => {
  assert.deepEqual(['open', 'later', 'closed', 'paused'].map(statusLabel), ['今から入れる', '今日このあと入れる', '今日は入れない', '今は入れない']);
  setLanguage('en');
  assert.deepEqual(['open', 'later', 'closed', 'paused'].map(statusLabel), ['Open now', 'Opens later today', 'Not today', 'Not accepting pass users now']);
});

test('formatLive names each bath, or merges baths that say the same thing', () => {
  const vacant = { bath: 'male', level: 'vacant', label: '空き' };
  const busy = { bath: 'female', level: 'busy', label: 'やや混雑' };
  assert.deepEqual(formatLive([vacant, busy]), [
    { level: 'vacant', text: '男湯 空き' },
    { level: 'busy', text: '女湯 やや混雑' },
  ]);
  assert.deepEqual(formatLive([{ ...vacant, level: 'closed', label: '利用時間外' }, { ...busy, level: 'closed', label: '利用時間外' }]), [
    { level: 'closed', text: '利用時間外' },
  ]);
  assert.deepEqual(formatLive([{ bath: null, level: 'unavailable', label: '入浴不可' }]), [
    { level: 'unavailable', text: '入浴不可' },
  ]);
});

test('formatLiveHeading shows when the data was read', () => {
  assert.equal(formatLiveHeading(21 * 60 + 5), '公式の混雑状況（21:05 取得）');
});

test('formats hours, walks and congestion in English', () => {
  setLanguage('en');
  const windows = [{ start: 750, end: 840, lastEntry: 810 }, { start: 1080, end: 1200, lastEntry: null }];
  assert.equal(formatWindows(windows), '12:30–14:00 (last entry 13:30), 18:00–20:00');
  assert.equal(formatWindows([]), 'The pass cannot be used here today');
  assert.equal(formatWalk(7, 'your location'), 'About 7 min walk from your location');
  assert.equal(formatWalk(null, 'your location'), 'Not within walking distance (car or shuttle)');
  assert.deepEqual(formatLive([
    { bath: 'male', level: 'vacant', label: '空き' },
    { bath: 'female', level: 'full', label: '大変混雑' },
  ]).map((chip) => chip.text), ['Men: Not crowded', 'Women: Very crowded']);
  assert.deepEqual(formatLive([{ bath: 'male', level: 'unknown', label: '清掃中' }]).map((chip) => chip.text), ['清掃中']);
  assert.equal(formatLiveHeading(21 * 60 + 5), 'Official crowd status (as of 21:05)');
});

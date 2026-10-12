import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const holidays = JSON.parse(readFileSync(new URL('../../data/holidays.json', import.meta.url), 'utf8'));

test('covers 2026 and 2027 from the Cabinet Office CSV', () => {
  assert.deepEqual(holidays.years, [2026, 2027]);
  assert.equal(holidays.source, 'https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv');
  assert.match(holidays.checkedOn, /^\d{4}-\d{2}-\d{2}$/);
});

test('uses YYYY-MM-DD keys inside the covered years', () => {
  for (const [key, name] of Object.entries(holidays.dates)) {
    assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(holidays.years.includes(Number(key.slice(0, 4))), key);
    assert.ok(name.length > 0, key);
  }
});

test('matches the known 2026 and 2027 holidays', () => {
  const keys = Object.keys(holidays.dates);
  assert.equal(keys.filter((key) => key.startsWith('2026-')).length, 18);
  assert.equal(keys.filter((key) => key.startsWith('2027-')).length, 17);
  assert.equal(holidays.dates['2026-09-22'], '休日');
  assert.equal(holidays.dates['2026-10-12'], 'スポーツの日');
  assert.equal(holidays.dates['2027-03-22'], '休日');
});

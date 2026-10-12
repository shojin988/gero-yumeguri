import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHolidayCsv } from '../../tools/update-holidays.js';

const CSV = [
  '国民の祝日・休日月日,国民の祝日・休日名称',
  '2025/11/24,休日',
  '2026/1/1,元日',
  '2026/9/22,休日',
  '2027/3/21,春分の日',
  '',
].join('\r\n');

test('keeps only the requested years with zero-padded keys', () => {
  assert.deepEqual(parseHolidayCsv(CSV, [2026]), { '2026-01-01': '元日', '2026-09-22': '休日' });
});

test('ignores blank and malformed lines', () => {
  assert.deepEqual(parseHolidayCsv(`${CSV}\r\n\r\nfoo,bar\r\n`, [2027]), { '2027-03-21': '春分の日' });
});

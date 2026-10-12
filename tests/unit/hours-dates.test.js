import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, buildDayContext, ceilToStep, daysBetween, formatHm, minutesOfDay, parseHm, toDateKey, weekdayKey,
} from '../../js/hours.js';
import { HOLIDAYS } from './fixtures.js';

test('parseHm converts HH:MM to minutes', () => {
  assert.equal(parseHm('12:30'), 750);
  assert.equal(parseHm('08:00'), 480);
  assert.equal(parseHm('24:00'), 1440);
});

test('parseHm rejects malformed times', () => {
  for (const text of ['8:00', '25:00', '12:60', '24:30', '']) {
    assert.throws(() => parseHm(text), /時刻の形式が不正です/, text);
  }
});

test('formatHm pads hours and minutes', () => {
  assert.equal(formatHm(750), '12:30');
  assert.equal(formatHm(480), '08:00');
});

test('ceilToStep rounds up to the step', () => {
  assert.equal(ceilToStep(601, 5), 605);
  assert.equal(ceilToStep(600, 5), 600);
});

test('minutesOfDay and toDateKey use local time', () => {
  const date = new Date(2026, 9, 5, 9, 7);
  assert.equal(minutesOfDay(date), 547);
  assert.equal(toDateKey(date), '2026-10-05');
});

test('addDays and daysBetween cross month and year boundaries', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(daysBetween('2026-09-27', '2027-03-26'), 180);
});

test('weekdayKey returns the day of the week', () => {
  assert.equal(weekdayKey('2026-10-05'), 'mon');
  assert.equal(weekdayKey('2026-09-27'), 'sun');
});

test('buildDayContext describes a normal Monday', () => {
  assert.deepEqual(buildDayContext('2026-10-05', HOLIDAYS), {
    dateKey: '2026-10-05',
    monthDay: '10-05',
    weekday: 'mon',
    holidayName: null,
    isHoliday: false,
    dayType: 'mon',
    isBeforeHoliday: false,
    hasHolidayData: true,
  });
});

test('buildDayContext treats national holidays as hol', () => {
  const day = buildDayContext('2026-10-12', HOLIDAYS);
  assert.equal(day.dayType, 'hol');
  assert.equal(day.holidayName, 'スポーツの日');
  assert.equal(day.isHoliday, true);
});

test('buildDayContext marks the day before a weekend or holiday', () => {
  assert.equal(buildDayContext('2026-10-09', HOLIDAYS).isBeforeHoliday, true);
  assert.equal(buildDayContext('2026-10-11', HOLIDAYS).isBeforeHoliday, true);
  assert.equal(buildDayContext('2026-10-08', HOLIDAYS).isBeforeHoliday, false);
});

test('buildDayContext honours a manual holiday override', () => {
  assert.equal(buildDayContext('2026-10-05', HOLIDAYS, true).dayType, 'hol');
  assert.equal(buildDayContext('2026-10-12', HOLIDAYS, false).dayType, 'mon');
});

test('buildDayContext reports years without holiday data', () => {
  assert.equal(buildDayContext('2028-01-03', HOLIDAYS).hasHolidayData, false);
  assert.equal(buildDayContext('2026-01-05', HOLIDAYS).hasHolidayData, true);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDayContext, earliestEntry, facilityStatus, windowsForDay } from '../../js/hours.js';
import { HOLIDAYS, makeFacility } from './fixtures.js';

const day = (dateKey) => buildDayContext(dateKey, HOLIDAYS);

const ogawayaLike = makeFacility('ogawaya', {
  schedule: [
    { days: ['mon', 'wed', 'fri'], windows: [{ start: '12:00', end: '14:00' }] },
    { days: ['tue', 'thu'], windows: [{ start: '13:00', end: '14:00' }] },
    { days: ['sat', 'sun', 'hol'], windows: [{ start: '12:00', end: '13:00' }] },
  ],
});

test('windowsForDay picks the rule for the weekday', () => {
  assert.deepEqual(windowsForDay(ogawayaLike, day('2026-10-05')), [{ start: 720, end: 840, lastEntry: null }]);
  assert.deepEqual(windowsForDay(ogawayaLike, day('2026-10-06')), [{ start: 780, end: 840, lastEntry: null }]);
});

test('windowsForDay uses the hol rule on national holidays', () => {
  assert.deepEqual(windowsForDay(ogawayaLike, day('2026-10-12')), [{ start: 720, end: 780, lastEntry: null }]);
});

test('windowsForDay returns [] when no rule covers the day type', () => {
  const weekdaysOnly = makeFacility('weekdays', { days: ['mon', 'tue', 'wed', 'thu', 'fri'] });
  assert.deepEqual(windowsForDay(weekdaysOnly, day('2026-10-12')), []);
  assert.deepEqual(windowsForDay(weekdaysOnly, day('2026-10-10')), []);
});

test('windowsForDay closes the day before a weekend or holiday when asked', () => {
  const hotel = makeFacility('hotel', { days: ['mon', 'tue', 'wed', 'thu', 'fri'], closedBeforeHoliday: true });
  assert.deepEqual(windowsForDay(hotel, day('2026-10-09')), []);
  assert.equal(windowsForDay(hotel, day('2026-10-08')).length, 1);
});

test('windowsForDay honours closed periods that wrap the new year', () => {
  const facility = makeFacility('newyear', { closedPeriods: [{ from: '12-29', to: '01-03', label: '年末年始' }] });
  assert.deepEqual(windowsForDay(facility, day('2026-12-31')), []);
  assert.deepEqual(windowsForDay(facility, day('2027-01-02')), []);
  assert.equal(windowsForDay(facility, day('2026-12-28')).length, 1);
  assert.equal(windowsForDay(facility, day('2027-01-04')).length, 1);
});

test('windowsForDay honours closed periods inside a year', () => {
  const facility = makeFacility('august', { closedPeriods: [{ from: '08-01', to: '08-31', label: '8月' }] });
  assert.deepEqual(windowsForDay(facility, day('2026-08-15')), []);
  assert.equal(windowsForDay(facility, day('2026-09-01')).length, 1);
});

test('windowsForDay sorts windows and parses last entry', () => {
  const facility = makeFacility('two', {
    schedule: [{
      days: ['mon'],
      windows: [{ start: '18:00', end: '20:00', lastEntry: '19:30' }, { start: '12:30', end: '14:00' }],
    }],
  });
  assert.deepEqual(windowsForDay(facility, day('2026-10-05')), [
    { start: 750, end: 840, lastEntry: null },
    { start: 1080, end: 1200, lastEntry: 1170 },
  ]);
});

const NOON_TO_TWO = [{ start: 720, end: 840, lastEntry: null }];

test('earliestEntry waits until the window opens', () => {
  assert.equal(earliestEntry(NOON_TO_TWO, 700, 45).entry, 720);
});

test('earliestEntry enters immediately inside the window', () => {
  assert.equal(earliestEntry(NOON_TO_TWO, 760, 45).entry, 760);
});

test('earliestEntry rejects a stay that would pass the end', () => {
  assert.equal(earliestEntry(NOON_TO_TWO, 800, 45), null);
});

test('earliestEntry moves on to a later window', () => {
  const windows = [{ start: 750, end: 840, lastEntry: 810 }, { start: 1080, end: 1200, lastEntry: 1170 }];
  assert.equal(earliestEntry(windows, 820, 45).entry, 1080);
});

test('earliestEntry respects the last entry time', () => {
  const windows = [{ start: 720, end: 900, lastEntry: 870 }];
  assert.equal(earliestEntry(windows, 880, 20), null);
  assert.equal(earliestEntry(windows, 860, 20).entry, 860);
});

test('facilityStatus reports open, later and closed', () => {
  assert.equal(facilityStatus(NOON_TO_TWO, 760, 45), 'open');
  assert.equal(facilityStatus(NOON_TO_TWO, 700, 45), 'later');
  assert.equal(facilityStatus(NOON_TO_TWO, 800, 45), 'closed');
  assert.equal(facilityStatus([], 700, 45), 'closed');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDayContext } from '../../js/hours.js';
import { MAX_PLANS, makePlans } from '../../js/planner.js';
import { HOLIDAYS, STATION, makeFacility } from './fixtures.js';

const MONDAY = buildDayContext('2026-10-05', HOLIDAYS);

function plan(facilities, overrides = {}) {
  return makePlans({
    facilities,
    day: MONDAY,
    startTime: 600,
    endTime: 1260,
    origin: STATION,
    goal: null,
    count: 1,
    stay: 45,
    ...overrides,
  });
}

test('ranks sets by the earliest finish and keeps only the fastest order of each set', () => {
  const facilities = [
    makeFacility('d', { lat: 35.804 }),
    makeFacility('c', { lat: 35.803 }),
    makeFacility('b', { lat: 35.802 }),
    makeFacility('a', { lat: 35.801 }),
  ];
  const plans = plan(facilities, { count: 3 });
  assert.deepEqual(plans.map((p) => p.key), ['a+b+c', 'a+b+d', 'a+c+d', 'b+c+d']);
  assert.deepEqual(plans[0].stops.map((s) => s.facility.id), ['a', 'b', 'c']);
  assert.equal(plans[0].finish, 741);
  assert.ok(plans.every((p, i) => i === 0 || plans[i - 1].finish <= p.finish));
});

test('does not report any price or savings', () => {
  const [result] = plan([makeFacility('a')]);
  assert.equal('totalSavings' in result, false);
});

test('waits when arriving before the window opens', () => {
  const [result] = plan([makeFacility('e', { windows: [['12:00', '14:00']] })]);
  const [stop] = result.stops;
  assert.deepEqual(
    { arrival: stop.arrival, entry: stop.entry, wait: stop.wait, leave: stop.leave },
    { arrival: 602, entry: 720, wait: 118, leave: 765 },
  );
});

test('skips a facility whose window ends before the stay finishes', () => {
  const facilities = [
    makeFacility('short', { lat: 35.801, windows: [['10:00', '10:30']] }),
    makeFacility('ok', { lat: 35.802 }),
  ];
  assert.deepEqual(plan(facilities).map((p) => p.key), ['ok']);
});

test('uses the second window when the first one is too late', () => {
  const facility = makeFacility('g', { windows: [['12:30', '14:00', '13:30'], ['18:00', '20:00', '19:30']] });
  const [result] = plan([facility], { startTime: 810 });
  assert.equal(result.stops[0].entry, 1080);
});

test('excludes facilities that are closed on that day', () => {
  const tuesday = buildDayContext('2026-10-06', HOLIDAYS);
  assert.deepEqual(plan([makeFacility('mon-only', { days: ['mon'] })], { day: tuesday }), []);
});

test('rejects plans that cannot reach the goal before the end time', () => {
  const far = makeFacility('far', { lat: 35.805 });
  assert.deepEqual(plan([far], { goal: STATION, endTime: 660 }), []);
  const [result] = plan([far], { goal: STATION, endTime: 665 });
  assert.equal(result.finish, 665);
  assert.equal(result.goalWalk, 10);
  assert.equal(result.totalWalk, 20);
});

test('ranks the nearer facility first', () => {
  const facilities = [makeFacility('far', { lat: 35.805 }), makeFacility('near', { lat: 35.801 })];
  assert.deepEqual(plan(facilities).map((p) => p.key), ['near', 'far']);
});

test('returns at most MAX_PLANS plans', () => {
  const facilities = [1, 2, 3, 4, 5, 6, 7].map((n) => makeFacility(`f${n}`, { lat: 35.8 + n / 1000 }));
  assert.equal(plan(facilities).length, MAX_PLANS);
});

test('returns an empty list when there are fewer candidates than stops', () => {
  assert.deepEqual(plan([makeFacility('a'), makeFacility('b')], { count: 3 }), []);
});

test('leaves out facilities that cannot be reached on foot', () => {
  const facilities = [
    makeFacility('by-car', { lat: 35.801, walkable: false }),
    makeFacility('on-foot', { lat: 35.802 }),
  ];
  assert.deepEqual(plan(facilities).map((p) => p.key), ['on-foot']);
});

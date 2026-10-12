import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GEOLOCATION_PERMISSION_DENIED, distanceMeters, positionAfterError, resolveOrigin, walkMinutes } from '../../js/geo.js';
import { STATION } from './fixtures.js';

const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

const north = (degrees) => ({ lat: STATION.lat + degrees, lng: STATION.lng });

test('distanceMeters is zero for the same point', () => {
  assert.equal(distanceMeters(STATION, STATION), 0);
});

test('distanceMeters measures 0.001 degrees of latitude as about 111 m', () => {
  assert.ok(Math.abs(distanceMeters(STATION, north(0.001)) - 111.195) < 0.5);
});

test('walkMinutes applies the detour factor and rounds up', () => {
  assert.equal(walkMinutes(STATION, north(0.001)), 2);
  assert.equal(walkMinutes(STATION, north(0.004)), 8);
  assert.equal(walkMinutes(STATION, STATION), 0);
});

test('resolveOrigin uses the position when it is near Gero', () => {
  const position = north(0.002);
  assert.deepEqual(resolveOrigin(position, STATION), { point: position, isFallback: false, reason: null });
});

test('resolveOrigin falls back to the station without a position', () => {
  assert.deepEqual(resolveOrigin(null, STATION), { point: STATION, isFallback: true, reason: 'unavailable' });
});

test('resolveOrigin falls back to the station when far away', () => {
  assert.deepEqual(resolveOrigin(north(0.09), STATION), { point: STATION, isFallback: true, reason: 'far' });
});

test('positionAfterError clears the position when permission is denied', () => {
  assert.equal(positionAfterError(STATION, GEOLOCATION_PERMISSION_DENIED), null);
});

test('positionAfterError keeps the previous position on a transient error', () => {
  assert.deepEqual(positionAfterError(STATION, POSITION_UNAVAILABLE), STATION);
  assert.deepEqual(positionAfterError(STATION, TIMEOUT), STATION);
});

test('positionAfterError has nothing to fall back to without a previous fix', () => {
  assert.equal(positionAfterError(null, POSITION_UNAVAILABLE), null);
  assert.equal(positionAfterError(null, TIMEOUT), null);
  assert.equal(positionAfterError(null, GEOLOCATION_PERMISSION_DENIED), null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES_STORAGE_KEY, DEFAULT_PLAN_INPUTS, STORAGE_KEY, loadPlanInputs, loadVisibleCategories, sanitizePlanInputs, savePlanInputs, saveVisibleCategories,
} from '../../js/storage.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
  };
}

const throwingStorage = {
  getItem() { throw new Error('denied'); },
  setItem() { throw new Error('denied'); },
};

test('loadPlanInputs returns defaults when nothing is saved', () => {
  assert.deepEqual(loadPlanInputs(memoryStorage()), DEFAULT_PLAN_INPUTS);
});

test('savePlanInputs and loadPlanInputs round-trip', () => {
  const storage = memoryStorage();
  const inputs = { endTime: '18:30', goal: 'none', count: 2, stay: 30 };
  assert.equal(savePlanInputs(inputs, storage), true);
  assert.deepEqual(loadPlanInputs(storage), inputs);
});

test('sanitizePlanInputs replaces invalid values with defaults', () => {
  assert.deepEqual(sanitizePlanInputs({ endTime: '7pm', goal: 'moon', count: 9, stay: 5 }), DEFAULT_PLAN_INPUTS);
  assert.deepEqual(sanitizePlanInputs(null), DEFAULT_PLAN_INPUTS);
});

test('loadPlanInputs falls back to defaults on broken JSON', () => {
  assert.deepEqual(loadPlanInputs(memoryStorage({ [STORAGE_KEY]: '{broken' })), DEFAULT_PLAN_INPUTS);
});

test('storage errors fall back to defaults', () => {
  assert.deepEqual(loadPlanInputs(throwingStorage), DEFAULT_PLAN_INPUTS);
  assert.equal(savePlanInputs(DEFAULT_PLAN_INPUTS, throwingStorage), false);
});

test('missing storage falls back to defaults', () => {
  assert.deepEqual(loadPlanInputs(null), DEFAULT_PLAN_INPUTS);
  assert.equal(savePlanInputs(DEFAULT_PLAN_INPUTS, null), false);
});

test('visible categories round-trip', () => {
  const storage = memoryStorage();
  assert.equal(saveVisibleCategories(['onsen', 'food'], storage), true);
  assert.deepEqual(loadVisibleCategories(storage), ['onsen', 'food']);
});

test('loadVisibleCategories falls back to onsen only', () => {
  assert.deepEqual(loadVisibleCategories(memoryStorage()), ['onsen']);
  assert.deepEqual(loadVisibleCategories(memoryStorage({ [CATEGORIES_STORAGE_KEY]: '{broken' })), ['onsen']);
  assert.deepEqual(loadVisibleCategories(memoryStorage({ [CATEGORIES_STORAGE_KEY]: '"food"' })), ['onsen']);
  assert.deepEqual(loadVisibleCategories(memoryStorage({ [CATEGORIES_STORAGE_KEY]: '["bogus"]' })), []);
  assert.deepEqual(loadVisibleCategories(throwingStorage), ['onsen']);
  assert.deepEqual(loadVisibleCategories(null), ['onsen']);
  assert.equal(saveVisibleCategories(['food'], throwingStorage), false);
  assert.equal(saveVisibleCategories(['food'], null), false);
});

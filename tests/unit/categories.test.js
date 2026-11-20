import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterByCategory, sanitizeVisibleCategories } from '../../js/categories.js';

test('sanitizeVisibleCategories keeps known ids in registry order', () => {
  assert.deepEqual(sanitizeVisibleCategories(['food', 'onsen', 'food', 'bogus']), ['onsen', 'food']);
  assert.deepEqual(sanitizeVisibleCategories([]), []);
});

test('sanitizeVisibleCategories falls back to onsen only', () => {
  for (const value of [null, undefined, 'food', 42, { food: true }]) {
    assert.deepEqual(sanitizeVisibleCategories(value), ['onsen'], String(value));
  }
});

test('filterByCategory keeps only visible categories', () => {
  const items = [{ category: 'onsen' }, { category: 'food' }];
  assert.deepEqual(filterByCategory(items, ['food']), [{ category: 'food' }]);
  assert.deepEqual(filterByCategory(items, []), []);
});

test('sanitizeVisibleCategories falls back when only unknown ids remain', () => {
  assert.deepEqual(sanitizeVisibleCategories(['bogus']), ['onsen']);
  assert.deepEqual(sanitizeVisibleCategories(['bogus', 'food']), ['food']);
});

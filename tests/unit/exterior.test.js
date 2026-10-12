import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STREET_VIEW_PREFIX, safeStreetViewUrl } from '../../js/exterior.js';

test('safeStreetViewUrl accepts Google Maps embed URLs', () => {
  const url = `${STREET_VIEW_PREFIX}!6m8!1m7!1sabc!2m2!1d35.8!2d137.24!3f10!4f5!5f0.8`;
  assert.equal(safeStreetViewUrl(url), url);
});

test('safeStreetViewUrl rejects anything else', () => {
  for (const value of [null, undefined, '', 'javascript:alert(1)', 'http://www.google.com/maps/embed?pb=x', 'https://evil.example/maps/embed?pb=x', 'https://www.google.com/maps/place/x']) {
    assert.equal(safeStreetViewUrl(value), null, String(value));
  }
});

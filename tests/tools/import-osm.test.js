import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bboxAround, buildOverpassQuery, diffShops, toDrafts } from '../../tools/import-osm.js';

const SAMPLE = JSON.parse(readFileSync(new URL('./fixtures/overpass-sample.json', import.meta.url), 'utf8'));

test('bboxAround adds the margin on every side', () => {
  const bbox = bboxAround([{ lat: 35.8, lng: 137.24 }], 200);
  assert.ok(Math.abs(bbox.north - 35.8 - 0.0017966) < 1e-6);
  assert.ok(Math.abs(35.8 - bbox.south - 0.0017966) < 1e-6);
  assert.ok(bbox.east - 137.24 > 0.0017966, 'longitude margin grows with latitude');
  assert.ok(Math.abs((bbox.east - 137.24) - (137.24 - bbox.west)) < 1e-9);
});

test('bboxAround covers every point', () => {
  const bbox = bboxAround([{ lat: 35.80, lng: 137.24 }, { lat: 35.81, lng: 137.25 }], 0);
  assert.deepEqual(bbox, { south: 35.80, west: 137.24, north: 35.81, east: 137.25 });
});

test('buildOverpassQuery embeds the bbox in south,west,north,east order', () => {
  const query = buildOverpassQuery({ south: 1, west: 2, north: 3, east: 4 });
  assert.equal(query, '[out:json][timeout:25];nwr["amenity"~"^(restaurant|fast_food)$"](1,2,3,4);out center tags;');
});

test('toDrafts keeps named places and maps cuisines', () => {
  const drafts = toDrafts(SAMPLE);
  assert.deepEqual(drafts.map((draft) => draft.id), ['osm-node-101', 'osm-node-404', 'osm-node-505', 'osm-way-202']);
  const [soba, shokudo, vegan, way] = drafts;
  assert.deepEqual(soba.cuisine, ['soba', 'udon']);
  assert.deepEqual(soba.names, { en: 'Sample Soba' });
  assert.equal(soba.officialUrl, 'https://example.com/soba');
  assert.equal(soba.osm, 'node/101');
  assert.equal(soba.category, 'food');
  assert.equal(soba.schedule, null);
  assert.equal(soba.hoursSource, null);
  assert.equal(soba.irregularClosure, false);
  assert.equal(soba.mapsUrl, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('サンプルそば 下呂')}`);
  assert.equal(soba.reference.opening_hours, 'Mo-Su 11:00-15:00');
  assert.deepEqual(way.cuisine, ['soba']);
  assert.deepEqual([way.lat, way.lng], [35.8071, 137.2441]);
  assert.equal('names' in way, false);
  assert.deepEqual(shokudo.cuisine, ['other']);
  assert.equal(shokudo.officialUrl, null, 'only https websites become the official link');
  assert.deepEqual(vegan.cuisine, ['other']);
  assert.equal(vegan.reference.phone, '+81-576-00-0000');
});

test('diffShops reports added, removed and moved shops', () => {
  const current = [
    { id: 'osm-node-101', name: 'サンプルそば', lat: 35.8061 + 0.00027, lng: 137.2431 },
    { id: 'osm-way-202', name: '旧名', lat: 35.8071, lng: 137.2441 },
    { id: 'osm-node-999', name: '閉店した店', lat: 35.80, lng: 137.24 },
    { id: 'local-kyokai', name: '協会の店', lat: 35.80, lng: 137.25 },
  ];
  const diff = diffShops(current, toDrafts(SAMPLE));
  assert.deepEqual(diff.added.map((shop) => shop.id), ['osm-node-404', 'osm-node-505']);
  assert.deepEqual(diff.removed.map((shop) => shop.id), ['osm-node-999']);
  assert.deepEqual(diff.changed, [
    { id: 'osm-node-101', fields: ['location'] },
    { id: 'osm-way-202', fields: ['name'] },
  ]);
});

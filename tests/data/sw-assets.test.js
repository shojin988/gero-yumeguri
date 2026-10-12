import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const sw = readFileSync(new URL('sw.js', root), 'utf8');
const block = /const ASSETS = \[([\s\S]*?)\];/.exec(sw)?.[1] ?? '';
const assets = [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]);

test('every precached asset exists', () => {
  assert.ok(assets.length > 0, 'ASSETS must not be empty');
  for (const asset of assets.filter((path) => path !== './')) {
    assert.ok(existsSync(new URL(asset, root)), `${asset} does not exist`);
  }
});

test('precaches every module, data file and icon', () => {
  const expected = [
    './',
    './index.html',
    './css/style.css',
    './manifest.webmanifest',
    './data/facilities.json',
    './data/holidays.json',
    './vendor/leaflet/leaflet.js',
    './vendor/leaflet/leaflet.css',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    ...readdirSync(new URL('js/', root)).map((file) => `./js/${file}`),
  ];
  for (const path of expected) {
    assert.ok(assets.includes(path), `${path} is missing from ASSETS`);
  }
});

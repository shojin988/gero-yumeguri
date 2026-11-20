// OpenStreetMap（Overpass API）から温泉街の飲食店の候補を取り、docs/shop-drafts/ に下書きを書き出す。
// data/shops.json は書き換えない。観光協会の情報と見比べてから人の手で shops.json に移す。
// 使い方: node tools/import-osm.js
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { distanceMeters } from '../js/geo.js';
import { toDateKey } from '../js/hours.js';

export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const METERS_PER_DEGREE_LAT = 111_320;
const MARGIN_METERS = 200;
// これより動いた店は「位置が変わった」と知らせる
const MOVED_METERS = 20;
const NAME_LANGUAGES = ['en', 'zh-Hant', 'zh-Hans', 'ko'];
const REFERENCE_TAGS = ['opening_hours', 'phone', 'addr:full', 'addr:city', 'addr:street', 'addr:housenumber', 'website', 'cuisine'];
const MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';

// OSM の cuisine タグ → このアプリの料理の種類（js/shop-items.js の CUISINES）
export const OSM_CUISINE_MAP = Object.freeze({
  soba: 'soba',
  noodle: 'soba',
  udon: 'udon',
  ramen: 'ramen',
  sushi: 'sushi',
  japanese: 'japanese',
  regional: 'japanese',
  yakiniku: 'yakiniku',
  barbecue: 'yakiniku',
  italian: 'italian',
  pizza: 'italian',
  chinese: 'chinese',
  curry: 'curry',
  burger: 'burger',
  western: 'western',
  steak_house: 'western',
});

const ROOT = new URL('../', import.meta.url);

export function bboxAround(points, marginMeters) {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const latMargin = marginMeters / METERS_PER_DEGREE_LAT;
  const lngMargin = marginMeters / (METERS_PER_DEGREE_LAT * Math.cos((centerLat * Math.PI) / 180));
  return {
    south: Math.min(...lats) - latMargin,
    west: Math.min(...lngs) - lngMargin,
    north: Math.max(...lats) + latMargin,
    east: Math.max(...lngs) + lngMargin,
  };
}

export function buildOverpassQuery({ south, west, north, east }) {
  return `[out:json][timeout:25];nwr["amenity"~"^(restaurant|fast_food)$"](${south},${west},${north},${east});out center tags;`;
}

function cuisinesOf(tag) {
  const mapped = (tag ?? '').split(';').map((value) => OSM_CUISINE_MAP[value.trim()] ?? 'other');
  return [...new Set(mapped)];
}

function pick(tags, keys) {
  return Object.fromEntries(keys.filter((key) => tags[key] !== undefined).map((key) => [key, tags[key]]));
}

function toDraft(element) {
  const { tags } = element;
  const names = Object.fromEntries(NAME_LANGUAGES.filter((language) => tags[`name:${language}`]).map((language) => [language, tags[`name:${language}`]]));
  return {
    id: `osm-${element.type}-${element.id}`,
    category: 'food',
    name: tags.name,
    ...(Object.keys(names).length > 0 ? { names } : {}),
    cuisine: cuisinesOf(tags.cuisine),
    lat: element.lat ?? element.center.lat,
    lng: element.lon ?? element.center.lon,
    schedule: null,
    irregularClosure: false,
    hoursSource: null,
    officialUrl: tags.website?.startsWith('https://') ? tags.website : null,
    mapsUrl: MAPS_SEARCH + encodeURIComponent(`${tags.name} 下呂`),
    osm: `${element.type}/${element.id}`,
    reference: pick(tags, REFERENCE_TAGS),
  };
}

export function toDrafts(overpassJson) {
  return overpassJson.elements
    .filter((element) => element.tags?.name)
    .map(toDraft)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function diffShops(current, drafts) {
  const fromOsm = current.filter((shop) => shop.id.startsWith('osm-'));
  const currentById = new Map(fromOsm.map((shop) => [shop.id, shop]));
  const draftIds = new Set(drafts.map((draft) => draft.id));
  const changed = drafts
    .filter((draft) => currentById.has(draft.id))
    .map((draft) => {
      const shop = currentById.get(draft.id);
      const fields = [
        ...(shop.name !== draft.name ? ['name'] : []),
        ...(distanceMeters(shop, draft) > MOVED_METERS ? ['location'] : []),
      ];
      return { id: draft.id, fields };
    })
    .filter((entry) => entry.fields.length > 0);
  return {
    added: drafts.filter((draft) => !currentById.has(draft.id)),
    removed: fromOsm.filter((shop) => !draftIds.has(shop.id)),
    changed,
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, ROOT), 'utf8'));
}

async function main() {
  const facilities = readJson('data/facilities.json').facilities.filter((facility) => facility.walkable !== false);
  const query = buildOverpassQuery(bboxAround(facilities, MARGIN_METERS));
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'gero-yumeguri-import' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) {
    throw new Error(`Overpass API の取得に失敗しました: HTTP ${response.status}`);
  }
  const drafts = toDrafts(await response.json());
  const current = existsSync(new URL('data/shops.json', ROOT)) ? readJson('data/shops.json').shops : [];
  const diff = diffShops(current, drafts);
  const outputDir = new URL('docs/shop-drafts/', ROOT);
  mkdirSync(outputDir, { recursive: true });
  const output = new URL(`${toDateKey(new Date())}-osm.json`, outputDir);
  writeFileSync(output, `${JSON.stringify({ query, fetchedAt: new Date().toISOString(), drafts, diff }, null, 2)}\n`);
  process.stdout.write([
    `候補 ${drafts.length} 件を ${output.pathname} に書き出しました`,
    `新しく出た店 ${diff.added.length} 件 / 消えた店 ${diff.removed.length} 件 / 名前・位置が変わった店 ${diff.changed.length} 件`,
    '',
  ].join('\n'));
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

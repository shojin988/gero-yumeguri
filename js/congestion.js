// 下呂温泉旅館協同組合の「手形入浴 混雑状況」（https://vista.kohnan.kitchen/#/gero_top）が読み込んでいるデータ
export const CONGESTION_URL = 'https://kk-congestion-saas.antipasto.jp/json/GERO.json';
export const CONGESTION_PAGE_URL = 'https://vista.kohnan.kitchen/#/gero_top';

// 公式の表示ページのプログラムにある状態の一覧（2026-10-08 確認）
export const CONGESTION_LEVELS = Object.freeze({
  空き: 'vacant',
  やや混雑: 'busy',
  混雑: 'crowded',
  大変混雑: 'full',
  入浴不可: 'unavailable',
  利用時間外: 'closed',
});

const REFUSING_LEVELS = new Set(['full', 'unavailable']);
const BATH_SUFFIXES = [[' 男湯', 'male'], [' 女湯', 'female']];
const BATH_ORDER = { male: 0, female: 1 };

function bathOf(placeName) {
  return BATH_SUFFIXES.find(([suffix]) => placeName.endsWith(suffix))?.[1] ?? null;
}

function isEntry(value) {
  return value !== null && typeof value === 'object'
    && typeof value.place_id === 'string' && typeof value.place_name === 'string' && typeof value.congestion === 'string';
}

export function parseCongestion(json) {
  const list = json?.congestion_list;
  if (!Array.isArray(list)) {
    throw new Error('混雑データに congestion_list がありません');
  }
  return new Map(list.filter(isEntry).map((entry) => [entry.place_id, {
    bath: bathOf(entry.place_name),
    level: Object.hasOwn(CONGESTION_LEVELS, entry.congestion) ? CONGESTION_LEVELS[entry.congestion] : 'unknown',
    label: entry.congestion,
  }]));
}

export function congestionFor(facility, places) {
  if (!places || !Array.isArray(facility.congestionPlaceIds)) {
    return null;
  }
  const baths = facility.congestionPlaceIds
    .map((id) => places.get(id))
    .filter(Boolean)
    .sort((a, b) => (BATH_ORDER[a.bath] ?? 2) - (BATH_ORDER[b.bath] ?? 2));
  return baths.length > 0 ? baths : null;
}

// 一部の浴場しかデータが無いときは、残りが入れるかもしれないので外さない
export function blocksEntry(baths, expectedCount = baths?.length ?? 0) {
  return Array.isArray(baths) && baths.length > 0 && baths.length >= expectedCount
    && baths.every((bath) => REFUSING_LEVELS.has(bath.level));
}

// 取り直しが重なったときは最後に始めたものだけを使い、失敗しても keepForMs までは前回のデータを残す
export function createCongestionLoader({ load, onUpdate, now = Date.now, keepForMs, warn = console.warn }) {
  let latestRequest = 0;
  let lastGood = null;
  return async function refresh() {
    latestRequest += 1;
    const request = latestRequest;
    try {
      const places = await load();
      if (request === latestRequest) {
        lastGood = { places, fetchedAt: now() };
        onUpdate(lastGood);
      }
    } catch (error) {
      if (request !== latestRequest) {
        return;
      }
      warn('混雑状況を読み込めませんでした', error);
      if (lastGood && now() - lastGood.fetchedAt > keepForMs) {
        lastGood = null;
        onUpdate(null);
      } else if (!lastGood) {
        onUpdate(null);
      }
    }
  };
}

export async function fetchCongestion({ signal } = {}) {
  const response = await fetch(CONGESTION_URL, { signal, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`混雑データの読み込みに失敗しました（HTTP ${response.status}）`);
  }
  return parseCongestion(await response.json());
}

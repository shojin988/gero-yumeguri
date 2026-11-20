import { windowsForDay } from './hours.js';
import { walkMinutes } from './geo.js';

// 料理の種類として使える言葉。増やすときは messages.js の cuisine.<言葉> も5言語分足す。
export const CUISINES = Object.freeze([
  'soba', 'udon', 'ramen', 'hidagyu', 'sushi', 'japanese', 'teishoku', 'izakaya',
  'yakiniku', 'western', 'italian', 'chinese', 'curry', 'burger', 'other',
]);

// 店は温泉と違って滞在時間を考えず、着いた時刻にラストオーダー（無ければ閉店前）に間に合うかで決める
export function shopStatus(windows, arrival) {
  const isOpen = windows.some((range) => range.start <= arrival
    && (range.lastEntry !== null ? arrival <= range.lastEntry : arrival < range.end));
  if (isOpen) {
    return 'open';
  }
  return windows.some((range) => range.start > arrival) ? 'later' : 'closed';
}

export function buildShopItems({ shops, day, now, origin }) {
  return shops.map((shop) => {
    const walk = walkMinutes(origin, shop);
    if (shop.schedule === null) {
      return { category: shop.category, shop, windows: null, walk, status: 'unknown' };
    }
    const windows = windowsForDay({ schedule: shop.schedule, closedPeriods: [], closedBeforeHoliday: false }, day);
    return { category: shop.category, shop, windows, walk, status: shopStatus(windows, now + walk) };
  });
}

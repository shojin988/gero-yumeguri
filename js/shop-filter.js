// 飲食店の絞り込み（料理のまとまりと夜の営業）。選んだ値は保存しない。

// ラストオーダー（無ければ閉店）がこの時刻より後なら「夜も開いている」
export const EVENING_FROM = 19 * 60;

// 料理のまとまり。料理（js/shop-items.js の CUISINES）を増やしたら、other 以外はどこか1つに入れる。
export const SHOP_GROUPS = Object.freeze([
  Object.freeze({ id: 'all', labelKey: 'cuisineGroup.all', cuisines: null }),
  Object.freeze({ id: 'japanese', labelKey: 'cuisineGroup.japanese', cuisines: Object.freeze(['japanese', 'teishoku', 'unagi', 'keichan']) }),
  Object.freeze({ id: 'noodles', labelKey: 'cuisineGroup.noodles', cuisines: Object.freeze(['soba', 'udon', 'ramen']) }),
  Object.freeze({ id: 'sushi', labelKey: 'cuisineGroup.sushi', cuisines: Object.freeze(['sushi']) }),
  Object.freeze({ id: 'yakiniku', labelKey: 'cuisineGroup.yakiniku', cuisines: Object.freeze(['yakiniku', 'hidagyu']) }),
  Object.freeze({ id: 'izakaya', labelKey: 'cuisineGroup.izakaya', cuisines: Object.freeze(['izakaya']) }),
  Object.freeze({ id: 'western', labelKey: 'cuisineGroup.western', cuisines: Object.freeze(['western', 'italian', 'burger']) }),
  Object.freeze({ id: 'chinese', labelKey: 'cuisineGroup.chinese', cuisines: Object.freeze(['chinese']) }),
  Object.freeze({ id: 'curry', labelKey: 'cuisineGroup.curry', cuisines: Object.freeze(['curry']) }),
]);

export const DEFAULT_SHOP_FILTER = Object.freeze({ group: 'all', eveningOnly: false });

export function matchesGroup(shop, groupId) {
  const group = SHOP_GROUPS.find((candidate) => candidate.id === groupId);
  if (!group || group.cuisines === null) {
    return true;
  }
  return shop.cuisine.some((cuisine) => group.cuisines.includes(cuisine));
}

// 今日の営業時間（休みなら []、不明なら null）で判定する。今開いているかは見ない。
export function isOpenInEvening(windows) {
  return (windows ?? []).some((range) => (range.lastEntry ?? range.end) > EVENING_FROM);
}

export function filterShopItems(items, { group, eveningOnly }) {
  return items.filter((item) => matchesGroup(item.shop, group) && (!eveningOnly || isOpenInEvening(item.windows)));
}

// 地図と一覧に出す種類の一覧。種類を増やすときはここに1行足し、messages.js に名前の訳を足す。
export const CATEGORIES = Object.freeze([
  Object.freeze({ id: 'onsen', labelKey: 'category.onsen' }),
  Object.freeze({ id: 'food', labelKey: 'category.food' }),
]);

// data/shops.json の店が持てる種類
export const SHOP_CATEGORY_IDS = Object.freeze(['food']);

// 初めて開いたときは今までどおり温泉だけを出す
export const DEFAULT_VISIBLE = Object.freeze(['onsen']);

export function sanitizeVisibleCategories(value) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_VISIBLE];
  }
  const known = CATEGORIES.map((category) => category.id).filter((id) => value.includes(id));
  // 自分で全部オフにした [] はそのまま。種類の id が変わって何も残らない古い保存値は初期値に戻す
  return value.length > 0 && known.length === 0 ? [...DEFAULT_VISIBLE] : known;
}

export function filterByCategory(items, visible) {
  return items.filter((item) => visible.includes(item.category));
}

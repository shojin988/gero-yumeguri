import { el } from './dom.js';
import { SHOP_HOUR_KEYS, cuisineLabel, formatWalk, formatWindows, shopStatusLabel } from './format.js';
import { shopName, t } from './i18n.js';

// 飲食店のカード。外観は付けず、Googleマップで確かめてもらう。
export function renderShopCard(item, { originLabel }) {
  const { shop, windows, walk, status } = item;
  return el('article', {
    className: `facility-card shop-card status-${status}`,
    dataset: { shopId: shop.id, walk: String(walk) },
  }, [
    el('header', { className: 'card-header' }, [
      el('h3', { text: shopName(shop) }),
      el('span', { className: `status-chip status-${status}`, text: shopStatusLabel(status) }),
    ]),
    el('p', { className: 'card-cuisine', text: shop.cuisine.map(cuisineLabel).join(t('hours.separator')) }),
    el('p', {
      className: 'card-hours',
      text: windows === null ? t('shopCard.hoursUnknown') : t('shopCard.hours', { hours: formatWindows(windows, SHOP_HOUR_KEYS) }),
    }),
    shop.irregularClosure ? el('p', { className: 'card-irregular', text: t('shopCard.irregular') }) : null,
    el('p', { className: 'card-walk', text: formatWalk(walk, originLabel) }),
    el('div', { className: 'card-links' }, [
      shop.officialUrl ? el('a', { className: 'button', href: shop.officialUrl, target: '_blank', rel: 'noopener', text: t('card.official') }) : null,
      el('a', { className: 'button', href: shop.mapsUrl, target: '_blank', rel: 'noopener', text: t('card.maps') }),
    ]),
  ]);
}

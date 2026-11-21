import { el } from './dom.js';
import { t } from './i18n.js';
import { DEFAULT_SHOP_FILTER, SHOP_GROUPS } from './shop-filter.js';

// 飲食店の絞り込みの段。料理のまとまりは1つだけ選べ、選び直すたびに onChange で知らせる（保存はしない）。
export function createShopFilterBar({ container, onChange }) {
  let filter = DEFAULT_SHOP_FILTER;

  function update(patch) {
    filter = { ...filter, ...patch };
    for (const button of chips) {
      button.setAttribute('aria-pressed', String(button.dataset.group === filter.group));
    }
    onChange(filter);
  }

  const chips = SHOP_GROUPS.map((group) => el('button', {
    type: 'button',
    className: 'cuisine-chip',
    dataset: { group: group.id },
    'aria-pressed': String(group.id === filter.group),
    text: t(group.labelKey),
    onClick: () => update({ group: group.id }),
  }));

  container.replaceChildren(
    el('div', { className: 'cuisine-chips', role: 'group', 'aria-label': t('shopFilter.label') }, chips),
  );
}

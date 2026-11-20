import { el } from './dom.js';
import { renderFacilityCard } from './card.js';
import { filterItems, sortItems } from './facility-items.js';
import { t } from './i18n.js';
import { renderShopCard } from './shop-card.js';

export function createListView({ listElement, sortSelect, openOnlyCheckbox, onShowExterior }) {
  let latest = null;

  function renderCard(item) {
    return item.shop
      ? renderShopCard(item, { originLabel: latest.originLabel })
      : renderFacilityCard(item, { originLabel: latest.originLabel, liveAt: latest.liveAt, exterior: 'button', onShowExterior });
  }

  function emptyRow() {
    return el('li', { className: 'empty', text: latest.noCategory ? t('list.noCategory') : t('list.empty') });
  }

  function draw() {
    if (!latest) {
      return;
    }
    const visible = filterItems(sortItems(latest.items, sortSelect.value), { openOnly: openOnlyCheckbox.checked });
    const rows = visible.length > 0
      ? visible.map((item) => el('li', {}, renderCard(item)))
      : [emptyRow()];
    listElement.replaceChildren(...rows);
  }

  sortSelect.addEventListener('change', draw);
  openOnlyCheckbox.addEventListener('change', draw);

  return {
    render(items, { originLabel, liveAt = null, noCategory = false }) {
      latest = { items, originLabel, liveAt, noCategory };
      draw();
    },
  };
}

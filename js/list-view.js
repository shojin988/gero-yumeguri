import { el } from './dom.js';
import { renderFacilityCard } from './card.js';
import { filterItems, sortItems } from './facility-items.js';
import { t } from './i18n.js';

export function createListView({ listElement, sortSelect, openOnlyCheckbox, onShowExterior }) {
  let latest = null;

  function draw() {
    if (!latest) {
      return;
    }
    const visible = filterItems(sortItems(latest.items, sortSelect.value), { openOnly: openOnlyCheckbox.checked });
    const rows = visible.length > 0
      ? visible.map((item) => el('li', {}, renderFacilityCard(item, { originLabel: latest.originLabel, liveAt: latest.liveAt, exterior: 'button', onShowExterior })))
      : [el('li', { className: 'empty', text: t('list.empty') })];
    listElement.replaceChildren(...rows);
  }

  sortSelect.addEventListener('change', draw);
  openOnlyCheckbox.addEventListener('change', draw);

  return {
    render(items, { originLabel, liveAt = null }) {
      latest = { items, originLabel, liveAt };
      draw();
    },
  };
}

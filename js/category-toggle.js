import { el } from './dom.js';
import { CATEGORIES, sanitizeVisibleCategories } from './categories.js';
import { t } from './i18n.js';

// 地図と一覧で共通の「表示する種類」ボタン。押すたびにオン・オフし、選ばれている種類を onChange で知らせる。
export function createCategoryToggle({ container, initial, onChange }) {
  let visible = sanitizeVisibleCategories(initial);

  const buttons = CATEGORIES.map((category) => el('button', {
    type: 'button',
    className: 'category-button',
    dataset: { category: category.id },
    'aria-pressed': String(visible.includes(category.id)),
    text: t(category.labelKey),
    onClick: () => {
      const next = visible.includes(category.id)
        ? visible.filter((id) => id !== category.id)
        : [...visible, category.id];
      visible = sanitizeVisibleCategories(next);
      for (const button of buttons) {
        button.setAttribute('aria-pressed', String(visible.includes(button.dataset.category)));
      }
      onChange(visible);
    },
  }));

  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', t('category.label'));
  container.replaceChildren(...buttons);

  return {
    visible: () => visible,
  };
}

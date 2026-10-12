import { el } from './dom.js';
import { facilityName, t } from './i18n.js';

export const STREET_VIEW_PREFIX = 'https://www.google.com/maps/embed?pb=';

export function safeStreetViewUrl(url) {
  return typeof url === 'string' && url.startsWith(STREET_VIEW_PREFIX) ? url : null;
}

export function renderExterior(facility, { isOnline }) {
  const url = safeStreetViewUrl(facility.streetViewUrl);
  if (url === null) {
    return el('p', { className: 'exterior-message', text: t('exterior.missing') });
  }
  if (!isOnline) {
    return el('p', { className: 'exterior-message', text: t('exterior.offline') });
  }
  return el('iframe', {
    className: 'exterior-frame',
    src: url,
    title: t('exterior.frameTitle', { name: facilityName(facility) }),
    loading: 'lazy',
    referrerpolicy: 'no-referrer-when-downgrade',
    allowfullscreen: true,
  });
}

export function createExteriorDialog({ dialog, titleElement, bodyElement }) {
  dialog.addEventListener('close', () => bodyElement.replaceChildren());
  return {
    open(facility) {
      titleElement.textContent = t('exterior.title', { name: facilityName(facility) });
      bodyElement.replaceChildren(renderExterior(facility, { isOnline: navigator.onLine }));
      dialog.showModal();
    },
  };
}

import { el } from './dom.js';
import { CONGESTION_PAGE_URL } from './congestion.js';
import { renderExterior } from './exterior.js';
import { formatLive, formatLiveHeading, formatWalk, formatWindows, statusLabel } from './format.js';
import { facilityName, facilityNotes, t } from './i18n.js';

function renderLive(live, liveAt) {
  if (!live || liveAt === null) {
    return null;
  }
  return el('p', { className: 'card-live' }, [
    el('a', { className: 'live-heading', href: CONGESTION_PAGE_URL, target: '_blank', rel: 'noopener', text: formatLiveHeading(liveAt) }),
    ...formatLive(live).map(({ level, text }) => el('span', { className: `live-chip live-${level}`, text })),
  ]);
}

export function renderFacilityCard(item, { originLabel, liveAt = null, exterior = 'none', onShowExterior = null }) {
  const { facility, windows, walk, status } = item;
  const notes = facilityNotes(facility);
  return el('article', {
    className: `facility-card status-${status}`,
    dataset: { facilityId: facility.id, walk: item.walk === null ? '' : String(walk) },
  }, [
    el('header', { className: 'card-header' }, [
      el('h3', { text: facilityName(facility) }),
      el('span', { className: `status-chip status-${status}`, text: statusLabel(status) }),
    ]),
    exterior === 'inline' ? el('div', { className: 'card-exterior' }, renderExterior(facility, { isOnline: navigator.onLine })) : null,
    el('p', { className: 'card-hours', text: t('card.hours', { hours: formatWindows(windows) }) }),
    renderLive(item.live, liveAt),
    item.followsLive && liveAt !== null ? el('p', { className: 'card-follows-live', text: t('card.followsLive') }) : null,
    el('p', { className: 'card-walk', text: formatWalk(walk, originLabel) }),
    notes.length > 0
      ? el('ul', { className: 'card-notes' }, notes.map((note) => el('li', { text: note })))
      : null,
    el('div', { className: 'card-links' }, [
      exterior === 'button' ? el('button', { type: 'button', className: 'button exterior-button', text: t('card.exterior'), onClick: () => onShowExterior(facility) }) : null,
      el('a', { className: 'button', href: facility.officialUrl, target: '_blank', rel: 'noopener', text: t('card.official') }),
      el('a', { className: 'button', href: facility.mapsUrl, target: '_blank', rel: 'noopener', text: t('card.maps') }),
    ]),
  ]);
}

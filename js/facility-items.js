import { blocksEntry, congestionFor } from './congestion.js';
import { facilityStatus, windowsForDay } from './hours.js';
import { currentLocale, facilityName } from './i18n.js';
import { walkMinutes } from './geo.js';

export function buildFacilityItems({ facilities, day, now, origin, stay, congestion = null }) {
  return facilities.map((facility) => {
    const windows = windowsForDay(facility, day);
    const walk = facility.walkable === false ? null : walkMinutes(origin, facility);
    return {
      facility,
      windows,
      walk,
      status: facilityStatus(windows, now + (walk ?? 0), stay),
      live: congestionFor(facility, congestion),
    };
  });
}

const byName = (a, b) => facilityName(a.facility).localeCompare(facilityName(b.facility), currentLocale());

const COMPARATORS = {
  distance: (a, b) => (a.walk ?? Infinity) - (b.walk ?? Infinity) || byName(a, b),
  name: byName,
};

export function sortItems(items, sortKey) {
  const compare = COMPARATORS[sortKey] ?? COMPARATORS.distance;
  return [...items].sort(compare);
}

export function filterItems(items, { openOnly }) {
  return openOnly ? items.filter((item) => item.status === 'open' && !blocksEntry(item.live, item.facility.congestionPlaceIds?.length)) : items;
}

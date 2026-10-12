import { blocksEntry, congestionFor } from './congestion.js';
import { facilityStatus, windowsForDay } from './hours.js';
import { currentLocale, facilityName } from './i18n.js';
import { walkMinutes } from './geo.js';

const TAKING_GUESTS = new Set(['vacant', 'busy', 'crowded']);

// 公式の混雑状況が分かるときはそちらを正とする（祝日などで時刻表と食い違うことがある）
function statusFromLive(live, expectedCount) {
  if (!live || live.length < expectedCount) {
    return null;
  }
  if (live.some((bath) => TAKING_GUESTS.has(bath.level))) {
    return 'open';
  }
  if (blocksEntry(live, expectedCount)) {
    return 'paused';
  }
  return live.every((bath) => bath.level === 'closed') ? 'closed' : null;
}

function combineStatus(scheduleStatus, liveStatus, windows, now) {
  if (liveStatus === 'open' || liveStatus === 'paused') {
    return liveStatus;
  }
  if (liveStatus === 'closed' && scheduleStatus === 'open') {
    return windows.some((range) => range.start > now) ? 'later' : 'closed';
  }
  return scheduleStatus;
}

export function buildFacilityItems({ facilities, day, now, origin, stay, congestion = null }) {
  return facilities.map((facility) => {
    const windows = windowsForDay(facility, day);
    const walk = facility.walkable === false ? null : walkMinutes(origin, facility);
    const live = congestionFor(facility, congestion);
    const scheduleStatus = facilityStatus(windows, now + (walk ?? 0), stay);
    const status = combineStatus(scheduleStatus, statusFromLive(live, facility.congestionPlaceIds?.length ?? 0), windows, now);
    return { facility, windows, walk, live, scheduleStatus, status, followsLive: status !== scheduleStatus };
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
  return openOnly ? items.filter((item) => item.status === 'open') : items;
}

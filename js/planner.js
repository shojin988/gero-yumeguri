import { earliestEntry, windowsForDay } from './hours.js';
import { walkMinutes } from './geo.js';

export const MAX_PLANS = 5;

function setKey(stops) {
  return stops.map((stop) => stop.facility.id).sort().join('+');
}

function isFaster(a, b) {
  return a.finish !== b.finish ? a.finish < b.finish : a.totalWalk < b.totalWalk;
}

function comparePlans(a, b) {
  return (a.finish - b.finish)
    || (a.totalWalk - b.totalWalk)
    || a.key.localeCompare(b.key);
}

function nextStop(candidate, position, time, stay, endTime) {
  const walk = walkMinutes(position, candidate.facility);
  const arrival = time + walk;
  const slot = earliestEntry(candidate.windows, arrival, stay);
  if (!slot || slot.entry + stay > endTime) {
    return null;
  }
  return { facility: candidate.facility, walk, arrival, entry: slot.entry, wait: slot.entry - arrival, leave: slot.entry + stay };
}

export function makePlans({ facilities, day, startTime, endTime, origin, goal, count, stay }) {
  const candidates = facilities
    .filter((facility) => facility.walkable !== false)
    .map((facility) => ({ facility, windows: windowsForDay(facility, day) }))
    .filter((candidate) => candidate.windows.length > 0);
  const bestBySet = new Map();

  const visit = (used, stops, time, position, walkSoFar) => {
    if (stops.length === count) {
      const goalWalk = goal ? walkMinutes(position, goal) : 0;
      const finished = { key: setKey(stops), stops, goalWalk, totalWalk: walkSoFar + goalWalk, finish: time + goalWalk };
      const current = bestBySet.get(finished.key);
      if (finished.finish <= endTime && (!current || isFaster(finished, current))) {
        bestBySet.set(finished.key, finished);
      }
      return;
    }
    for (const candidate of candidates) {
      const stop = used.includes(candidate) ? null : nextStop(candidate, position, time, stay, endTime);
      if (stop) {
        visit([...used, candidate], [...stops, stop], stop.leave, candidate.facility, walkSoFar + stop.walk);
      }
    }
  };

  visit([], [], startTime, origin, 0);
  return [...bestBySet.values()]
    .sort(comparePlans)
    .slice(0, MAX_PLANS);
}

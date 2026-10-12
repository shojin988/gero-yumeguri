import { formatHm } from './hours.js';
import { t } from './i18n.js';

const STATUSES = new Set(['open', 'later', 'closed']);
const KNOWN_LIVE_LEVELS = new Set(['vacant', 'busy', 'crowded', 'full', 'unavailable', 'closed']);

export function statusLabel(status) {
  return STATUSES.has(status) ? t(`status.${status}`) : status;
}

function formatRange(range) {
  const lastEntry = range.lastEntry !== null ? t('hours.lastEntry', { time: formatHm(range.lastEntry) }) : '';
  return t('hours.range', { start: formatHm(range.start), end: formatHm(range.end) }) + lastEntry;
}

export function formatWindows(windows) {
  return windows.length === 0 ? t('hours.none') : windows.map(formatRange).join(t('hours.separator'));
}

// 公式に無い状態は、公式の文言（日本語）のまま出す
function liveState(bath) {
  return KNOWN_LIVE_LEVELS.has(bath.level) ? t(`live.${bath.level}`) : bath.label;
}

export function formatLive(baths) {
  const sameForAll = baths.every((bath) => bath.label === baths[0].label);
  if (sameForAll) {
    return [{ level: baths[0].level, text: liveState(baths[0]) }];
  }
  return baths.map((bath) => ({
    level: bath.level,
    text: bath.bath ? t('live.withBath', { bath: t(`bath.${bath.bath}`), state: liveState(bath) }) : liveState(bath),
  }));
}

export function formatLiveHeading(minutes) {
  return t('live.heading', { time: formatHm(minutes) });
}

export function formatWalk(minutes, fromLabel) {
  return minutes === null ? t('walk.out') : t('walk.minutes', { from: fromLabel, minutes });
}

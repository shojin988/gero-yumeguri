export const ALL_DAY_TYPES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'hol'];

export const HOLIDAYS = Object.freeze({
  years: [2026, 2027],
  dates: {
    '2026-09-21': '敬老の日',
    '2026-09-22': '休日',
    '2026-09-23': '秋分の日',
    '2026-10-12': 'スポーツの日',
    '2027-01-01': '元日',
  },
});

export const STATION = Object.freeze({ name: '下呂駅', lat: 35.8, lng: 137.24 });

function toWindow([start, end, lastEntry]) {
  return lastEntry ? { start, end, lastEntry } : { start, end };
}

export function makeFacility(id, options = {}) {
  const {
    lat = 35.801,
    lng = 137.24,
    windows = [['09:00', '21:00']],
    days = ALL_DAY_TYPES,
    schedule,
    closedPeriods = [],
    closedBeforeHoliday = false,
    walkable,
  } = options;
  return {
    id,
    name: options.name ?? id,
    lat,
    lng,
    schedule: schedule ?? [{ days, windows: windows.map(toWindow) }],
    closedPeriods,
    closedBeforeHoliday,
    officialUrl: 'https://example.com/',
    mapsUrl: 'https://example.com/map',
    notes: [],
    ...(walkable === false ? { walkable: false } : {}),
  };
}

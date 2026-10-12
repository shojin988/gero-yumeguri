export const DAY_TYPES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'hol'];

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MS_PER_DAY = 86_400_000;
const MINUTES_PER_HOUR = 60;

const pad2 = (value) => String(value).padStart(2, '0');

export function parseHm(text) {
  const match = /^(\d{2}):(\d{2})$/.exec(text);
  const hours = match ? Number(match[1]) : NaN;
  const minutes = match ? Number(match[2]) : NaN;
  const isValid = match && minutes < 60 && (hours < 24 || (hours === 24 && minutes === 0));
  if (!isValid) {
    throw new Error(`時刻の形式が不正です: ${text}`);
  }
  return hours * MINUTES_PER_HOUR + minutes;
}

export function formatHm(totalMinutes) {
  return `${pad2(Math.floor(totalMinutes / MINUTES_PER_HOUR))}:${pad2(totalMinutes % MINUTES_PER_HOUR)}`;
}

export function ceilToStep(minutes, step) {
  return Math.ceil(minutes / step) * step;
}

export function minutesOfDay(date) {
  return date.getHours() * MINUTES_PER_HOUR + date.getMinutes();
}

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function keyToUtcMs(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function addDays(dateKey, days) {
  const date = new Date(keyToUtcMs(dateKey) + days * MS_PER_DAY);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function daysBetween(fromKey, toKey) {
  return Math.round((keyToUtcMs(toKey) - keyToUtcMs(fromKey)) / MS_PER_DAY);
}

export function weekdayKey(dateKey) {
  return WEEKDAY_KEYS[new Date(keyToUtcMs(dateKey)).getUTCDay()];
}

function holidayNameOf(dateKey, holidayData) {
  return Object.hasOwn(holidayData.dates, dateKey) ? holidayData.dates[dateKey] : null;
}

export function buildDayContext(dateKey, holidayData, holidayOverride = null) {
  const weekday = weekdayKey(dateKey);
  const holidayName = holidayNameOf(dateKey, holidayData);
  const isHoliday = holidayOverride ?? holidayName !== null;
  const nextKey = addDays(dateKey, 1);
  const nextWeekday = weekdayKey(nextKey);
  return {
    dateKey,
    monthDay: dateKey.slice(5),
    weekday,
    holidayName,
    isHoliday,
    dayType: isHoliday ? 'hol' : weekday,
    isBeforeHoliday: nextWeekday === 'sat' || nextWeekday === 'sun' || holidayNameOf(nextKey, holidayData) !== null,
    hasHolidayData: holidayData.years.includes(Number(dateKey.slice(0, 4))),
  };
}

function inPeriod(monthDay, from, to) {
  return from <= to ? monthDay >= from && monthDay <= to : monthDay >= from || monthDay <= to;
}

function toRange(raw) {
  return {
    start: parseHm(raw.start),
    end: parseHm(raw.end),
    lastEntry: raw.lastEntry ? parseHm(raw.lastEntry) : null,
  };
}

export function windowsForDay(facility, day) {
  if (facility.closedPeriods.some((period) => inPeriod(day.monthDay, period.from, period.to))) {
    return [];
  }
  if (facility.closedBeforeHoliday && day.isBeforeHoliday) {
    return [];
  }
  const rule = facility.schedule.find((candidate) => candidate.days.includes(day.dayType));
  if (!rule) {
    return [];
  }
  return rule.windows.map(toRange).sort((a, b) => a.start - b.start);
}

export function earliestEntry(windows, arrival, stay) {
  for (const range of windows) {
    const entry = Math.max(arrival, range.start);
    const latestEntry = Math.min(range.lastEntry ?? Infinity, range.end - stay);
    if (entry <= latestEntry) {
      return { entry, window: range };
    }
  }
  return null;
}

export function facilityStatus(windows, arrival, stay) {
  const slot = earliestEntry(windows, arrival, stay);
  if (!slot) {
    return 'closed';
  }
  return slot.entry === arrival ? 'open' : 'later';
}

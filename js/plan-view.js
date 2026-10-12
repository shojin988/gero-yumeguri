import { el } from './dom.js';
import { buildDayContext, ceilToStep, formatHm, parseHm } from './hours.js';
import { currentLanguage, facilityName, placeName, t } from './i18n.js';
import { makePlans } from './planner.js';
import { STAY_MAX, STAY_MIN, sanitizePlanInputs } from './storage.js';

const START_STEP_MINUTES = 5;
const LATEST_START = 23 * 60 + 55;
const EVENING_END_BUFFER_MINUTES = 180;
const NO_PLAN_HINT_KEYS = ['plan.hintEnd', 'plan.hintCount', 'plan.hintStay'];

function describeHoliday(day) {
  if (!day.hasHolidayData) {
    return t('plan.noHolidayData');
  }
  if (!day.holidayName) {
    return '';
  }
  // 祝日名のデータは日本語しかないので、日本語のときだけ名前を出す
  return currentLanguage() === 'ja' ? t('plan.isHoliday', { name: day.holidayName }) : t('plan.isHolidayUnnamed');
}

function describeStop(stop) {
  const wait = stop.wait > 0 ? t('plan.wait', { minutes: stop.wait, time: formatHm(stop.entry) }) : '';
  return t('plan.stop', {
    arrival: formatHm(stop.arrival), name: facilityName(stop.facility), walk: stop.walk, wait, leave: formatHm(stop.leave),
  });
}

function renderPlan(plan, index, { origin, goal, onShowPlan }) {
  const headline = t('plan.headline', { number: index + 1, walk: plan.totalWalk });
  return el('li', { className: 'plan-result' }, [
    el('h3', { text: headline }),
    el('ol', { className: 'plan-stops' }, plan.stops.map((stop) => el('li', { text: describeStop(stop) }))),
    el('p', { className: 'plan-finish', text: goal ? t('plan.finishAt', { place: placeName(goal), time: formatHm(plan.finish) }) : t('plan.finishTime', { time: formatHm(plan.finish) }) }),
    el('button', { type: 'button', className: 'secondary', text: t('plan.showOnMap'), onClick: () => onShowPlan({ plan, origin, goal }) }),
  ]);
}

function renderResults(results, { plans, notes, origin, goal, onShowPlan }) {
  const noteNodes = notes.map((text) => el('p', { className: 'notice', text }));
  if (plans.length === 0) {
    results.replaceChildren(...noteNodes, el('div', { className: 'no-plan' }, [
      el('p', { text: t('plan.none') }),
      el('ul', {}, NO_PLAN_HINT_KEYS.map((key) => el('li', { text: t(key) }))),
    ]));
    return;
  }
  results.replaceChildren(
    ...noteNodes,
    el('ol', { className: 'plan-list' }, plans.map((plan, index) => renderPlan(plan, index, { origin, goal, onShowPlan }))),
  );
}

function readForm(field) {
  const date = field('date').value;
  const startText = field('start').value.slice(0, 5);
  const endText = field('end').value.slice(0, 5);
  const stay = Number(field('stay').value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, message: t('plan.errorDate') };
  }
  if (!startText || !endText) {
    return { ok: false, message: t('plan.errorTimes') };
  }
  if (parseHm(startText) >= parseHm(endText)) {
    return { ok: false, message: t('plan.errorOrder') };
  }
  if (!Number.isInteger(stay) || stay < STAY_MIN || stay > STAY_MAX) {
    return { ok: false, message: t('plan.errorStay', { min: STAY_MIN, max: STAY_MAX }) };
  }
  return {
    ok: true,
    values: {
      date,
      stay,
      endText,
      holiday: field('holiday').checked,
      start: parseHm(startText),
      end: parseHm(endText),
      originChoice: field('origin').value,
      goalChoice: field('goal').value,
      count: Number(field('count').value),
    },
  };
}

export function createPlanView({ form, results, holidayNote, getContext, initialInputs, onInputsChange, onShowPlan }) {
  const field = (name) => form.elements.namedItem(name);
  const edited = { date: false, start: false, end: false };

  function syncHoliday() {
    if (!field('date').value) {
      return;
    }
    const day = buildDayContext(field('date').value, getContext().holidays);
    field('holiday').checked = day.isHoliday;
    holidayNote.textContent = describeHoliday(day);
  }

  function computeStartDefault(now) {
    return formatHm(Math.min(ceilToStep(now, START_STEP_MINUTES), LATEST_START));
  }

  function computeEndDefault(startMinutes) {
    const savedEnd = parseHm(initialInputs.endTime);
    return savedEnd <= startMinutes
      ? formatHm(Math.min(startMinutes + EVENING_END_BUFFER_MINUTES, LATEST_START))
      : initialInputs.endTime;
  }

  function fillDefaults() {
    const { todayKey, now } = getContext();
    field('date').value = todayKey;
    const startValue = computeStartDefault(now);
    field('start').value = startValue;
    field('end').value = computeEndDefault(parseHm(startValue));
    field('goal').value = initialInputs.goal;
    field('count').value = String(initialInputs.count);
    field('stay').value = String(initialInputs.stay);
    syncHoliday();
  }

  function refreshDefaults() {
    const { todayKey, now } = getContext();
    if (!edited.date) {
      field('date').value = todayKey;
      syncHoliday();
    }
    let startMinutes = parseHm(field('start').value);
    if (!edited.start) {
      const startValue = computeStartDefault(now);
      field('start').value = startValue;
      startMinutes = parseHm(startValue);
    }
    if (!edited.end) {
      field('end').value = computeEndDefault(startMinutes);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const parsed = readForm(field);
    if (!parsed.ok) {
      results.replaceChildren(el('p', { className: 'form-error', role: 'alert', text: parsed.message }));
      return;
    }
    const { values } = parsed;
    onInputsChange(sanitizePlanInputs({ endTime: values.endText, goal: values.goalChoice, count: values.count, stay: values.stay }));
    const context = getContext();
    const origin = values.originChoice === 'here' ? context.origin.point : context.station;
    const goal = values.goalChoice === 'station' ? context.station : null;
    const plans = makePlans({
      facilities: context.data.facilities,
      day: buildDayContext(values.date, context.holidays, values.holiday),
      startTime: values.start,
      endTime: values.end,
      origin,
      goal,
      count: values.count,
      stay: values.stay,
    });
    const notes = values.originChoice === 'here' && context.origin.isFallback
      ? [t('plan.fallbackOrigin')]
      : [];
    renderResults(results, { plans, notes, origin, goal, onShowPlan });
  }

  function handleDateEdited() {
    edited.date = true;
    syncHoliday();
  }

  field('date').addEventListener('input', handleDateEdited);
  field('date').addEventListener('change', handleDateEdited);
  field('start').addEventListener('input', () => { edited.start = true; });
  field('end').addEventListener('input', () => { edited.end = true; });
  form.addEventListener('submit', handleSubmit);
  fillDefaults();

  return { refreshDefaults };
}

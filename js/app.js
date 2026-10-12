import { createCongestionLoader, fetchCongestion } from './congestion.js';
import { el } from './dom.js';
import { createExteriorDialog } from './exterior.js';
import { buildFacilityItems } from './facility-items.js';
import { positionAfterError, resolveOrigin } from './geo.js';
import { buildDayContext, daysBetween, minutesOfDay, toDateKey } from './hours.js';
import {
  LANGUAGES, LANGUAGE_NAMES, currentLanguage, loadLanguage, placeName, resolveLanguage, saveLanguage, setLanguage, t, translateDocument,
} from './i18n.js';
import { createMapView } from './map-view.js';
import { createListView } from './list-view.js';
import { createPlanView } from './plan-view.js';
import { loadPlanInputs, savePlanInputs } from './storage.js';

const STALE_AFTER_DAYS = 180;
const REFRESH_INTERVAL_MS = 60_000;
// 公式の混雑表示ページと同じ5分間隔で取り直す
const CONGESTION_INTERVAL_MS = 5 * 60_000;
const CONGESTION_TIMEOUT_MS = 10_000;
// 一時的に取れなくても、この時間までは前回の混雑を出し続ける
const CONGESTION_KEEP_MS = 15 * 60_000;
const GEOLOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 };
const OFFICIAL_PAGE_URL = 'https://www.gero-spa.or.jp/yu_meguri/';
const EMPTY_HOLIDAYS = Object.freeze({ years: [], dates: {} });

setLanguage(resolveLanguage({
  search: location.search,
  saved: loadLanguage(),
  deviceLanguages: (navigator.languages ?? [navigator.language]).filter(Boolean),
}));
translateDocument(document);

const elements = {
  notices: document.getElementById('notices'),
  offlineBadge: document.getElementById('offline-badge'),
  infoButton: document.getElementById('info-button'),
  languageSelect: document.getElementById('language-select'),
  infoDialog: document.getElementById('info-dialog'),
  infoCheckedOn: document.getElementById('info-checked-on'),
  infoStale: document.getElementById('info-stale'),
};

const mapView = createMapView({
  mapElement: document.getElementById('map'),
  cardElement: document.getElementById('map-card'),
});

const exteriorDialog = createExteriorDialog({
  dialog: document.getElementById('exterior-dialog'),
  titleElement: document.getElementById('exterior-title'),
  bodyElement: document.getElementById('exterior-body'),
});

const listView = createListView({
  listElement: document.getElementById('facility-list'),
  sortSelect: document.getElementById('list-sort'),
  openOnlyCheckbox: document.getElementById('list-open-only'),
  onShowExterior: (facility) => exteriorDialog.open(facility),
});

let state = { data: null, holidays: null, congestion: null, position: null, positionStatus: 'pending', planInputs: loadPlanInputs() };

function setState(patch) {
  state = { ...state, ...patch };
  renderAll();
}

function buildContext() {
  const nowDate = new Date();
  const todayKey = toDateKey(nowDate);
  const station = state.data.places.geroStation;
  const origin = resolveOrigin(state.position, station);
  return {
    todayKey,
    now: minutesOfDay(nowDate),
    day: buildDayContext(todayKey, state.holidays),
    station,
    origin,
    originLabel: origin.isFallback ? placeName(station) : t('origin.here'),
    isStale: daysBetween(state.data.checkedOn, todayKey) > STALE_AFTER_DAYS,
  };
}

function renderNotices(context) {
  const messages = [];
  if (state.positionStatus !== 'pending' && context.origin.isFallback) {
    messages.push(context.origin.reason === 'far' ? t('notice.far') : t('notice.noPosition'));
  }
  if (context.isStale) {
    messages.push(t('notice.stale', { date: state.data.checkedOn }));
  }
  if (!context.day.hasHolidayData) {
    messages.push(t('notice.noHolidays'));
  }
  elements.notices.replaceChildren(...messages.map((text) => el('p', { className: 'notice', text })));
}

function renderAll() {
  if (!state.data) {
    return;
  }
  const context = buildContext();
  const items = buildFacilityItems({
    facilities: state.data.facilities,
    day: context.day,
    now: context.now,
    origin: context.origin.point,
    stay: state.planInputs.stay,
    congestion: state.congestion?.places ?? null,
  });
  const liveAt = state.congestion?.fetchedAt ?? null;
  mapView.render({ items, origin: context.origin.point, originLabel: context.originLabel, liveAt, showOriginDot: !context.origin.isFallback });
  listView.render(items, { originLabel: context.originLabel, liveAt });
  renderNotices(context);
  elements.infoStale.hidden = !context.isStale;
}

function selectTab(name) {
  for (const button of document.querySelectorAll('[data-tab]')) {
    button.setAttribute('aria-selected', String(button.dataset.tab === name));
  }
  for (const panel of document.querySelectorAll('[data-tab-panel]')) {
    panel.hidden = panel.dataset.tabPanel !== name;
  }
  if (name === 'map') {
    mapView.refreshSize();
  }
  if (name === 'plan') {
    planView?.refreshDefaults();
  }
}

const loadCongestion = createCongestionLoader({
  load: () => fetchCongestion({ signal: AbortSignal.timeout(CONGESTION_TIMEOUT_MS) }),
  onUpdate: (latest) => setState({
    congestion: latest && { places: latest.places, fetchedAt: minutesOfDay(new Date(latest.fetchedAt)) },
  }),
  keepForMs: CONGESTION_KEEP_MS,
});

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') {
    return;
  }
  renderAll();
  loadCongestion();
  planView?.refreshDefaults();
}

function watchPosition() {
  if (!('geolocation' in navigator)) {
    setState({ positionStatus: 'unavailable' });
    return;
  }
  navigator.geolocation.watchPosition(
    (position) => setState({
      position: { lat: position.coords.latitude, lng: position.coords.longitude },
      positionStatus: 'ok',
    }),
    (error) => {
      console.warn('現在地を取得できませんでした', error.message);
      const position = positionAfterError(state.position, error.code);
      setState({ position, positionStatus: position ? 'ok' : 'unavailable' });
    },
    GEOLOCATION_OPTIONS,
  );
}

function updateOnlineBadge() {
  elements.offlineBadge.hidden = navigator.onLine;
}

function showLoadError(error) {
  console.error(error);
  elements.notices.replaceChildren(el('p', { className: 'notice error' }, [
    t('load.failed'),
    el('a', { href: OFFICIAL_PAGE_URL, target: '_blank', rel: 'noopener', text: t('load.officialPage') }),
    t('load.checkThere'),
  ]));
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} の読み込みに失敗しました（HTTP ${response.status}）`);
  }
  return response.json();
}

async function loadHolidays() {
  try {
    return await loadJson('data/holidays.json');
  } catch (error) {
    console.warn('祝日データを読み込めませんでした', error);
    return EMPTY_HOLIDAYS;
  }
}

function switchLanguage(next) {
  saveLanguage(next);
  const url = new URL(location.href);
  url.searchParams.set('lang', next);
  location.replace(url);
}

function setupLanguageSelect() {
  elements.languageSelect.replaceChildren(...LANGUAGES.map((code) => el('option', { value: code, lang: code, text: LANGUAGE_NAMES[code] })));
  elements.languageSelect.value = currentLanguage();
  elements.languageSelect.addEventListener('change', () => switchLanguage(elements.languageSelect.value));
}

function setupChrome() {
  for (const button of document.querySelectorAll('[data-tab]')) {
    button.addEventListener('click', () => selectTab(button.dataset.tab));
  }
  elements.infoButton.addEventListener('click', () => elements.infoDialog.showModal());
  setupLanguageSelect();
  window.addEventListener('online', updateOnlineBadge);
  window.addEventListener('offline', updateOnlineBadge);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  updateOnlineBadge();
}

let planView = null;

function setupPlanView() {
  planView = createPlanView({
    form: document.getElementById('plan-form'),
    results: document.getElementById('plan-results'),
    holidayNote: document.getElementById('plan-holiday-note'),
    initialInputs: state.planInputs,
    getContext: () => {
      const context = buildContext();
      return {
        data: state.data,
        holidays: state.holidays,
        todayKey: context.todayKey,
        now: context.now,
        station: context.station,
        origin: context.origin,
      };
    },
    onInputsChange: (planInputs) => {
      savePlanInputs(planInputs);
      setState({ planInputs });
    },
    onShowPlan: ({ plan, origin, goal }) => {
      selectTab('map');
      mapView.showPlan({ plan, origin, goal });
    },
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  navigator.serviceWorker.register('sw.js').catch((error) => {
    console.error('サービスワーカーの登録に失敗しました', error);
  });
}

async function start() {
  setupChrome();
  registerServiceWorker();
  let data;
  try {
    data = await loadJson('data/facilities.json');
  } catch (error) {
    showLoadError(error);
    return;
  }
  const holidays = await loadHolidays();
  elements.infoCheckedOn.textContent = data.checkedOn;
  setState({ data, holidays });
  setupPlanView();
  watchPosition();
  setInterval(renderAll, REFRESH_INTERVAL_MS);
  loadCongestion();
  setInterval(loadCongestion, CONGESTION_INTERVAL_MS);
}

start();

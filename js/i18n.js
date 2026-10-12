import { MESSAGES } from './messages.js';

export const LANGUAGES = Object.freeze(['ja', 'en', 'zh-Hant', 'zh-Hans', 'ko']);
// 言語の選択肢は、その言語での名前で書く
export const LANGUAGE_NAMES = Object.freeze({
  ja: '日本語', en: 'English', 'zh-Hant': '繁體中文', 'zh-Hans': '简体中文', ko: '한국어',
});
export const LANGUAGE_STORAGE_KEY = 'gero-yumeguri:language:v1';
const DEFAULT_LANGUAGE = 'ja';
const LOCALES = Object.freeze({ ja: 'ja', en: 'en', 'zh-Hant': 'zh-Hant', 'zh-Hans': 'zh-Hans', ko: 'ko' });
const TRADITIONAL_CHINESE = /^zh-(tw|hk|mo|hant)/;

let language = DEFAULT_LANGUAGE;

const isSupported = (value) => LANGUAGES.includes(value);

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function languageOfDevice(tag) {
  const lower = tag.toLowerCase();
  if (lower.startsWith('ja')) {
    return 'ja';
  }
  if (lower.startsWith('zh')) {
    return TRADITIONAL_CHINESE.test(lower) ? 'zh-Hant' : 'zh-Hans';
  }
  return lower.startsWith('ko') ? 'ko' : 'en';
}

// URLの ?lang= → 前回選んだ言語 → 端末の言語の順に決める。対応していない言語の端末は英語にする。
export function resolveLanguage({ search = '', saved = null, deviceLanguages = [] } = {}) {
  const fromUrl = new URLSearchParams(search).get('lang');
  if (isSupported(fromUrl)) {
    return fromUrl;
  }
  if (isSupported(saved)) {
    return saved;
  }
  if (deviceLanguages.length === 0) {
    return DEFAULT_LANGUAGE;
  }
  return languageOfDevice(deviceLanguages[0]);
}

export function loadLanguage(storage = browserStorage()) {
  if (!storage) {
    return null;
  }
  try {
    const saved = storage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupported(saved) ? saved : null;
  } catch (error) {
    console.warn('前回の言語を読み込めませんでした', error);
    return null;
  }
}

export function saveLanguage(value, storage = browserStorage()) {
  if (!storage || !isSupported(value)) {
    return false;
  }
  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, value);
    return true;
  } catch (error) {
    console.warn('言語を保存できませんでした', error);
    return false;
  }
}

export function setLanguage(value) {
  if (isSupported(value)) {
    language = value;
  }
}

export function currentLanguage() {
  return language;
}

export function currentLocale() {
  return LOCALES[language];
}

export function t(key, params = {}) {
  const template = MESSAGES[language][key] ?? MESSAGES[DEFAULT_LANGUAGE][key];
  if (template === undefined) {
    return key;
  }
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

function translated(item) {
  return language === DEFAULT_LANGUAGE ? null : item?.i18n?.[language] ?? null;
}

export function facilityName(facility) {
  return translated(facility)?.name ?? facility.name;
}

export function facilityNotes(facility) {
  return translated(facility)?.notes ?? facility.notes;
}

export function translateDocument(doc) {
  doc.documentElement.lang = language;
  for (const node of doc.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of doc.querySelectorAll('[data-i18n-aria-label]')) {
    node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
  }
  for (const node of doc.querySelectorAll('[data-i18n-content]')) {
    node.setAttribute('content', t(node.dataset.i18nContent));
  }
}

export function placeName(place) {
  return translated(place)?.name ?? place.name;
}

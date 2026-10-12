import { MESSAGES } from './messages.js';

export const LANGUAGES = Object.freeze(['ja', 'en']);
export const LANGUAGE_STORAGE_KEY = 'gero-yumeguri:language:v1';
const DEFAULT_LANGUAGE = 'ja';
const LOCALES = Object.freeze({ ja: 'ja', en: 'en' });

let language = DEFAULT_LANGUAGE;

const isSupported = (value) => LANGUAGES.includes(value);

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// URLの ?lang= → 前回選んだ言語 → 端末の言語の順に決める。日本語以外の端末は英語にする。
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
  return deviceLanguages[0].toLowerCase().startsWith('ja') ? 'ja' : 'en';
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

// 切り替えボタンは切り替え先の言語で書かれている
const OTHER_LANGUAGE = Object.freeze({ ja: 'en', en: 'ja' });

export function translateDocument(doc) {
  doc.documentElement.lang = language;
  for (const node of doc.querySelectorAll('[data-i18n-other-language]')) {
    node.lang = OTHER_LANGUAGE[language];
  }
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
